import { normalizeJikanAnime } from './anime-normalizer';

const JIKAN_BASE_URL = process.env.JIKAN_API_BASE_URL || 'https://api.jikan.moe/v4';

export class JikanApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'JikanApiError';
    this.status = status;
  }
}

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new JikanApiError(`${fieldName} must be a positive integer`, 400);
  }
  return parsed;
}

async function jikanRequest(path, params) {
  const url = new URL(path, `${JIKAN_BASE_URL}/`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new JikanApiError(`Could not reach Jikan: ${error.message || 'Unknown error'}`, 0);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = detail ? `Jikan request failed (${response.status}): ${detail}` : `Jikan request failed (${response.status})`;
    throw new JikanApiError(message, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new JikanApiError(`Jikan returned malformed JSON: ${error.message || 'Unknown error'}`, 502);
  }
}

/** Fetch one anime from Jikan by MAL ID. */
export async function getAnimeFromJikan(malId, { anilistId = null } = {}) {
  const id = toPositiveInteger(malId, 'malId');
  const response = await jikanRequest(`anime/${id}/full`);

  if (!response?.data || typeof response.data !== 'object') {
    throw new JikanApiError(`Jikan anime ${id} was not found`, 404);
  }

  const anime = normalizeJikanAnime(response.data, { anilistId });
  if (!anime?.malId) {
    throw new JikanApiError('Jikan returned malformed anime data without mal_id', 502);
  }

  return anime;
}

/** Search Jikan by text and return only normalized internal anime objects. */
export async function searchAnimeWithJikan(query, { page = 1, limit = 20, anilistId = null } = {}) {
  const search = String(query || '').trim();
  if (!search) return { results: [], pagination: { currentPage: 1, hasNextPage: false, lastPage: 1, total: 0 } };

  const safePage = toPositiveInteger(page, 'page');
  const safeLimit = Math.min(toPositiveInteger(limit, 'limit'), 25);
  const response = await jikanRequest('anime', { q: search, page: safePage, limit: safeLimit });

  if (!Array.isArray(response?.data)) {
    throw new JikanApiError('Jikan returned a malformed search response', 502);
  }

  const pagination = response.pagination || {};
  return {
    results: response.data.map((anime) => normalizeJikanAnime(anime, { anilistId })).filter(Boolean),
    pagination: {
      currentPage: Number(pagination.current_page) || safePage,
      hasNextPage: Boolean(pagination.has_next_page),
      lastPage: Number(pagination.last_visible_page) || 1,
      total: Number(pagination.items?.total) || 0,
    },
  };
}

/** Return a normalized Jikan collection for a supported discovery mode. */
export async function getAnimeCollectionFromJikan({ mode = 'top', page = 1, limit = 20, query = null, season = null, year = null } = {}) {
  const safePage = toPositiveInteger(page, 'page');
  const safeLimit = Math.min(toPositiveInteger(limit, 'limit'), 25);
  let path = 'top/anime';
  let params = { page: safePage, limit: safeLimit };

  if (mode === 'search') {
    return searchAnimeWithJikan(query, { page: safePage, limit: safeLimit });
  }
  if (mode === 'seasonal' && season && year) {
    path = `seasons/${toPositiveInteger(year, 'year')}/${String(season).toLowerCase()}`;
  }

  const response = await jikanRequest(path, params);
  if (!Array.isArray(response?.data)) {
    throw new JikanApiError('Jikan returned a malformed collection response', 502);
  }
  const pagination = response.pagination || {};
  return {
    results: response.data.map((anime) => normalizeJikanAnime(anime)).filter(Boolean),
    pagination: {
      currentPage: Number(pagination.current_page) || safePage,
      hasNextPage: Boolean(pagination.has_next_page),
      lastPage: Number(pagination.last_visible_page) || 1,
      total: Number(pagination.items?.total) || 0,
    },
  };
}
