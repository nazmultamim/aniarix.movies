const GRAPHQL_ENDPOINT = process.env.ANILIST_GRAPHQL_ENDPOINT || 'https://graphql.anilist.co';
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class AniListApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'AniListApiError';
    this.status = status;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(attempt, fallback = 8000) {
  const delays = [1000, 2000, 4000, 8000];
  return delays[Math.min(attempt, delays.length - 1)] ?? fallback;
}

function isRetryableError(error) {
  if (error instanceof AniListApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status) || error.status === 0;
  }

  return Boolean(error?.message && /fetch|network|aborted|timeout/i.test(error.message));
}

export async function graphqlRequest(query, variables = {}, options = {}) {
  const { timeoutMs = 10000, retries = 5 } = options;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        const text = await response.text().catch(() => '');
        const message = text ? `${status}: ${text}` : `Request failed with status ${status}`;

        if (RETRYABLE_STATUS_CODES.has(status) && attempt < retries) {
          await sleep(getRetryDelay(attempt));
          continue;
        }

        throw new AniListApiError(message, status);
      }

      const json = await response.json();

      if (Array.isArray(json.errors) && json.errors.length > 0) {
        const message = json.errors.map((err) => err.message).join(', ');
        throw new AniListApiError(`AniList GraphQL error: ${message}`, 400);
      }

      return json.data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (isRetryableError(error) && attempt < retries) {
        await sleep(getRetryDelay(attempt));
        continue;
      }

      if (error instanceof AniListApiError) {
        throw error;
      }

      throw new AniListApiError(`Could not reach AniList API: ${error.message || 'Unknown error'}`, 0);
    }
  }

  throw lastError instanceof AniListApiError
    ? lastError
    : new AniListApiError('AniList request failed unexpectedly', 0);
}
