import { getRedisClient } from '@/lib/redis/client';

// In-memory map of in-flight upstream fetches, keyed by cache key. If two
// requests for the same key arrive concurrently before Redis is populated
// (e.g. two components both asking for the same anime at once), only one
// upstream fetch actually happens — both callers await the same promise.
// This is what satisfies "never make duplicate API requests" for the
// concurrent-request case; Redis itself handles the repeat-visit case.
const inflightRequests = new Map();

export const CACHE_TTL = {
  TWELVE_HOURS: 60 * 60 * 12,
  TWENTY_FOUR_HOURS: 60 * 60 * 24,
  SEVEN_DAYS: 60 * 60 * 24 * 7,
};

function decodeCachedValue(value) {
  if (value == null) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      console.error('[cache.service] Failed to parse cached JSON value.', { name: err?.name || 'Error' });
      return null;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return null;
}

export async function getCached(key) {
  try {
    const redis = getRedisClient();
    const value = await redis.get(key);
    return decodeCachedValue(value);
  } catch (err) {
    console.error('[cache.service] GET failed.', { name: err?.name || 'Error' });
    return null;
  }
}

export async function setCached(key, value, ttlSeconds) {
  try {
    const redis = getRedisClient();
    // Stringify the object before saving it to Redis
    const serializedValue = JSON.stringify(value);
    await redis.set(key, serializedValue, { ex: ttlSeconds });
  } catch (err) {
    console.error('[cache.service] SET failed.', { name: err?.name || 'Error' });
  }
}

export async function deleteCached(key) {
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (err) {
    console.error('[cache.service] DEL failed.', { name: err?.name || 'Error' });
  }
}

/**
 * Cache-aside helper: check Redis first, and on a miss run fetchFn(),
 * store the result for ttlSeconds, and return it. Concurrent misses for
 * the same key share one upstream call instead of firing N times.
 *
 * @param {string} key
 * @param {() => Promise<any>} fetchFn
 * @param {number} ttlSeconds
 * @returns {Promise<{ data: any, cached: boolean }>}
 */
export async function getOrSetCache(key, fetchFn, ttlSeconds) {
  const cached = await getCached(key);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  if (inflightRequests.has(key)) {
    const data = await inflightRequests.get(key);
    return { data, cached: false };
  }

  const promise = (async () => {
    try {
      const fresh = await fetchFn();
      await setCached(key, fresh, ttlSeconds);
      return fresh;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, promise);

  try {
    const data = await promise;
    return { data, cached: false };
  } catch (err) {
    const stale = await getCached(key);
    if (stale !== null) {
      return { data: stale, cached: true };
    }

    inflightRequests.delete(key);
    throw err;
  }
}
