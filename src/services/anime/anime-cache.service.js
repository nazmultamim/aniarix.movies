import { CACHE_TTL, getCached, setCached } from '@/services/Cache.service';

const CACHE_NAMESPACE = 'anime:v1';
const inflightRequests = new Map();

function normalizePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function normalizeSearchQuery(query) {
  return String(query || '').trim().toLowerCase();
}

function cacheEnvelope(data) {
  return {
    data,
    cachedAt: new Date().toISOString(),
  };
}

function readEnvelope(value) {
  if (!value || typeof value !== 'object' || !Object.hasOwn(value, 'data')) {
    return null;
  }
  return value.data;
}

function freshKey(key) {
  return `${key}:fresh`;
}

function staleKey(key) {
  return `${key}:stale`;
}

function cacheKind(key) {
  if (key.includes(':search:')) return 'search';
  if (key.includes(':trending:')) return 'trending';
  if (key.includes(':featured')) return 'featured';
  if (key.includes(':anilist:')) return 'anilist-detail';
  if (key.includes(':mal:')) return 'mal-detail';
  return 'anime';
}

export const animeCacheKeys = {
  byAniListId(anilistId) {
    return `${CACHE_NAMESPACE}:anilist:${normalizePositiveInteger(anilistId, 'anilistId')}`;
  },
  byMalId(malId) {
    return `${CACHE_NAMESPACE}:mal:${normalizePositiveInteger(malId, 'malId')}`;
  },
  search(query, { page = 1, perPage = 20 } = {}) {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery) throw new Error('query is required for an anime search cache key');

    return `${CACHE_NAMESPACE}:search:${encodeURIComponent(normalizedQuery)}:page:${normalizePositiveInteger(page, 'page')}:per-page:${normalizePositiveInteger(perPage, 'perPage')}`;
  },
  trending({ page = 1, limit = 20 } = {}) {
    return `${CACHE_NAMESPACE}:trending:page:${normalizePositiveInteger(page, 'page')}:limit:${normalizePositiveInteger(limit, 'limit')}`;
  },
  featured({ limit = 6 } = {}) {
    return `${CACHE_NAMESPACE}:featured:limit:${normalizePositiveInteger(limit, 'limit')}`;
  },
  collection(kind, { page = 1, limit = 20, season = null, year = null, filters = null } = {}) {
    const suffix = [
      `page:${normalizePositiveInteger(page, 'page')}`,
      `limit:${normalizePositiveInteger(limit, 'limit')}`,
      season ? `season:${String(season).toLowerCase()}` : null,
      year ? `year:${normalizePositiveInteger(year, 'year')}` : null,
      filters ? `filters:${encodeURIComponent(JSON.stringify(filters))}` : null,
    ].filter(Boolean).join(':');
    return `${CACHE_NAMESPACE}:collection:${kind}:${suffix}`;
  },
};

/** Return a fresh anime cache entry, if present. */
export async function getFreshAnimeCache(key) {
  const data = readEnvelope(await getCached(freshKey(key)));
  if (data !== null) {
    console.info(`[anime-cache] fresh cache hit (${cacheKind(key)}).`);
    return data;
  }

  console.info(`[anime-cache] fresh cache miss (${cacheKind(key)}).`);
  return null;
}

/** Return the longer-lived emergency anime cache entry, if present. */
export async function getStaleAnimeCache(key) {
  const data = readEnvelope(await getCached(staleKey(key)));
  if (data !== null) {
    console.warn(`[anime-cache] stale cache used (${cacheKind(key)}).`);
  }
  return data;
}

/** Write distinct fresh (24h) and stale (7d) copies of normalized anime data. */
export async function setAnimeCache(key, data) {
  const value = cacheEnvelope(data);
  await Promise.all([
    setCached(freshKey(key), value, CACHE_TTL.TWENTY_FOUR_HOURS),
    setCached(staleKey(key), value, CACHE_TTL.SEVEN_DAYS),
  ]);
  console.info(`[anime-cache] cache updated (${cacheKind(key)}).`);
}

/**
 * Cache normalized detail data under every known external identity. This makes
 * subsequent AniList-ID and MAL-ID requests independent cache lookups.
 */
export async function cacheAnimeByIdentity(anime, { primaryKey = null } = {}) {
  const keys = new Set(primaryKey ? [primaryKey] : []);
  if (anime?.anilistId) keys.add(animeCacheKeys.byAniListId(anime.anilistId));
  if (anime?.malId) keys.add(animeCacheKeys.byMalId(anime.malId));

  await Promise.all([...keys].map((key) => setAnimeCache(key, anime)));
}

/**
 * Cache-aside wrapper for canonical anime data. Redis failures are already
 * isolated by Cache.service.js, so upstream metadata requests remain usable.
 * A stale value is returned only when the supplied fetch function fails.
 */
export async function getOrFetchAnimeCache(key, fetchFn, { fallbackFn = null } = {}) {
  const fresh = await getFreshAnimeCache(key);
  if (fresh !== null) return { data: fresh, cached: true, stale: false };

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const request = (async () => {
    try {
      const data = await fetchFn();
      await setAnimeCache(key, data);
      return { data, cached: false, stale: false };
    } catch (error) {
      const stale = await getStaleAnimeCache(key);
      if (stale !== null) return { data: stale, cached: true, stale: true, fallback: true };

      if (typeof fallbackFn === 'function') {
        const fallback = await fallbackFn(error);
        if (fallback !== null && fallback !== undefined) {
          console.warn(`[anime-cache] persistent fallback used (${cacheKind(key)}).`);
          return { data: fallback, cached: true, stale: true, fallback: true, persistent: true };
        }
      }
      throw error;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, request);
  return request;
}
