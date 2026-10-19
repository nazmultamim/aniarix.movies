import { getAnimeCollectionFromAniList, getAnimeFromAniList, searchAnimeWithAniList } from './anilist.service';
import { getAnimeCollectionFromJikan, getAnimeFromJikan, searchAnimeWithJikan } from './jikan.service';
import {
  applyAnimeIdentity,
  createAnimeIdentity,
  hasAnimeIdentity,
  AnimeIdentityConflictError,
  getAnimeCollectionFromCatalog,
  getAnimeFromCatalog,
  resolveAnimeIdentity,
} from './anime-identity.service';
import { animeCacheKeys, cacheAnimeByIdentity, getOrFetchAnimeCache } from './anime-cache.service';

export class AnimeMetadataError extends Error {
  constructor(message, { cause = null, sourceErrors = [] } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AnimeMetadataError';
    this.sourceErrors = sourceErrors;
  }
}

function withMetadataStatus(data, { stale = false, persistent = false } = {}) {
  const status = stale ? 'stale' : 'fresh';
  const source = stale ? 'cache' : null;
  if (Array.isArray(data?.results)) {
    return {
      ...data,
      metadataStatus: stale ? 'fallback' : 'fresh',
      results: data.results.map((anime) => ({
        ...anime,
        ...(source ? { source } : {}),
        metadataStatus: status,
      })),
      ...(persistent ? { fallbackSource: data.fallbackSource || 'catalog' } : {}),
    };
  }

  return {
    ...data,
    ...(source ? { source } : {}),
    metadataStatus: status,
    ...(persistent ? { fallbackSource: data.fallbackSource || 'catalog' } : {}),
  };
}

function controlledEmptyCollection(page, limit, reason) {
  console.error('[anime.service] Returning controlled empty collection.', { reason });
  return {
    results: [],
    pagination: { currentPage: page, hasNextPage: false, lastPage: 1, total: 0 },
    metadataStatus: 'fallback',
    fallbackSource: 'unavailable',
  };
}

async function resolveCatalogIdentity(identity) {
  try {
    return await resolveAnimeIdentity(identity);
  } catch (error) {
    if (error instanceof AnimeIdentityConflictError) throw error;

    // Catalog lookup improves cross-provider resolution but must not prevent
    // a direct upstream request when the catalog is temporarily unavailable.
    console.warn('[anime.service] Catalog identity lookup failed; using supplied IDs.', {
      name: error?.name || 'Error',
    });
    return identity;
  }
}

/**
 * Read normalized metadata with AniList as primary and Jikan as a fallback.
 * Jikan is only asked for a specific anime when a MAL ID is known.
 */
export async function getAnime({ anilistId = null, malId = null } = {}) {
  const suppliedIdentity = createAnimeIdentity({ anilistId, malId });
  const requestedIdentity = await resolveCatalogIdentity(suppliedIdentity);
  if (!hasAnimeIdentity(requestedIdentity)) {
    throw new AnimeMetadataError('An AniList ID or MAL ID is required.');
  }

  const key = requestedIdentity.anilistId
    ? animeCacheKeys.byAniListId(requestedIdentity.anilistId)
    : animeCacheKeys.byMalId(requestedIdentity.malId);
  const result = await getOrFetchAnimeCache(key, async () => {
    const sourceErrors = [];

    if (requestedIdentity.anilistId) {
      try {
        const anime = await getAnimeFromAniList(requestedIdentity.anilistId);
        return applyAnimeIdentity(anime, requestedIdentity);
      } catch (error) {
        sourceErrors.push({ source: 'anilist', error });
        console.warn('[anime.service] AniList failed; attempting Jikan fallback.', { status: error?.status || 0 });
      }
    }

    if (requestedIdentity.malId) {
      try {
        const anime = await getAnimeFromJikan(requestedIdentity.malId, {
          anilistId: requestedIdentity.anilistId,
        });
        console.info('[anime.service] Jikan fallback succeeded.');
        return applyAnimeIdentity(anime, requestedIdentity);
      } catch (error) {
        sourceErrors.push({ source: 'jikan', error });
        console.warn('[anime.service] Jikan fallback failed.', { status: error?.status || 0 });
      }
    }

    throw new AnimeMetadataError('Anime metadata is unavailable from AniList and Jikan.', {
      cause: sourceErrors.at(-1)?.error || null,
      sourceErrors,
    });
  }, {
    fallbackFn: async () => getAnimeFromCatalog(requestedIdentity),
  });

  if (!result.cached) {
    await cacheAnimeByIdentity(result.data, { primaryKey: key });
  }

  return withMetadataStatus(result.data, result);
}

/** Search AniList first, falling back to Jikan when AniList fails. */
export async function searchAnime(query, options = {}) {
  const key = animeCacheKeys.search(query, options);
  const result = await getOrFetchAnimeCache(key, async () => {
    try {
      const data = await searchAnimeWithAniList(query, options);
      const results = data.results;
      return { ...data, results };
    } catch (anilistError) {
      console.warn('[anime.service] AniList search failed; attempting Jikan fallback.', {
        status: anilistError?.status || 0,
      });
      try {
        const data = await searchAnimeWithJikan(query, {
          page: options.page,
          limit: options.perPage,
        });
        console.info('[anime.service] Jikan search fallback succeeded.');
        return data;
      } catch (jikanError) {
        console.warn('[anime.service] Jikan search fallback failed.', { status: jikanError?.status || 0 });
        throw new AnimeMetadataError('Anime search is unavailable from AniList and Jikan.', {
          cause: jikanError,
          sourceErrors: [
            { source: 'anilist', error: anilistError },
            { source: 'jikan', error: jikanError },
          ],
        });
      }
    }
  }, {
    fallbackFn: async () => {
      const results = await getAnimeCollectionFromCatalog({ query, limit: options.perPage || 20 });
      if (results.length === 0) return null;
      return {
        results,
        pagination: { currentPage: options.page || 1, hasNextPage: false, lastPage: 1, total: results.length },
      };
    },
  }).catch((error) => controlledEmptyCollection(options.page || 1, options.perPage || 20, error?.name || 'search-unavailable'));

  return withMetadataStatus(result.data || result, result.data ? result : { stale: true, persistent: true });
}

// Shared by seasonal discovery and featured collection selection.
export function getCurrentAniListSeason(date = new Date()) {
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  if (month <= 2) return { season: 'WINTER', year: year - 1 };
  if (month <= 5) return { season: 'SPRING', year };
  if (month <= 8) return { season: 'SUMMER', year };
  if (month <= 11) return { season: 'FALL', year };
  return { season: 'WINTER', year };
}

async function getCollection({ kind, page = 1, limit = 20, anilistOptions, jikanOptions }) {
  const key = animeCacheKeys.collection(kind, { page, limit, season: anilistOptions?.season, year: anilistOptions?.seasonYear, filters: anilistOptions?.filters });
  const result = await getOrFetchAnimeCache(key, async () => {
    try {
      const data = await getAnimeCollectionFromAniList({ page, perPage: limit, ...anilistOptions });
      const results = await Promise.all(data.results.map(async (anime) => {
        return anime;
      }));
      return { ...data, results };
    } catch (anilistError) {
      console.warn(`[anime.service] AniList ${kind} failed; attempting Jikan fallback.`, { status: anilistError?.status || 0 });
      try {
        const data = await getAnimeCollectionFromJikan({ page, limit, ...jikanOptions });
        const results = data.results;
        return { ...data, results };
      } catch (jikanError) {
        throw new AnimeMetadataError(`${kind} anime is unavailable from AniList and Jikan.`, {
          cause: jikanError,
          sourceErrors: [{ source: 'anilist', error: anilistError }, { source: 'jikan', error: jikanError }],
        });
      }
    }
  }, {
    fallbackFn: async () => {
      const results = await getAnimeCollectionFromCatalog({ limit });
      if (results.length === 0) return null;
      return {
        results,
        pagination: { currentPage: page, hasNextPage: false, lastPage: 1, total: results.length },
      };
    },
  }).catch((error) => controlledEmptyCollection(page, limit, error?.name || 'metadata-unavailable'));
  return withMetadataStatus(result.data || result, result.data ? result : { stale: true, persistent: true });
}

export function getTrendingAnime({ page = 1, limit = 20 } = {}) {
  return getCollection({ kind: 'trending', page, limit, anilistOptions: { sort: ['TRENDING_DESC'] }, jikanOptions: { mode: 'top' } });
}

export function getTopAnime({ page = 1, limit = 20 } = {}) {
  return getCollection({ kind: 'top', page, limit, anilistOptions: { sort: ['SCORE_DESC'] }, jikanOptions: { mode: 'top' } });
}

export function getReleasedAnime({ page = 1, limit = 24 } = {}) {
  return getCollection({ kind: 'released', page, limit, anilistOptions: { sort: ['ID_DESC'] }, jikanOptions: { mode: 'top' } });
}

export function getSeasonalAnime({ year, season, page = 1, limit = 20 } = {}) {
  return getCollection({ kind: 'seasonal', page, limit, anilistOptions: { season, seasonYear: year, sort: ['POPULARITY_DESC'] }, jikanOptions: { mode: 'seasonal', season, year } });
}

export async function getFeaturedAnime({ limit = 6 } = {}) {
  const { season, year } = getCurrentAniListSeason();
  const [seasonal, trending, released, top] = await Promise.all([
    getSeasonalAnime({ year, season, limit: 12 }),
    getTrendingAnime({ limit: 12 }),
    getReleasedAnime({ limit: 12 }),
    getTopAnime({ limit: 12 }),
  ]);
  const seen = new Set();
  return [...seasonal.results, ...trending.results, ...released.results, ...top.results]
    .filter((anime) => {
      const identityKeys = [
        anime?.anilistId ? `anilist:${anime.anilistId}` : null,
        anime?.malId ? `mal:${anime.malId}` : null,
      ].filter(Boolean);
      if (identityKeys.length === 0 || identityKeys.some((key) => seen.has(key))) return false;
      identityKeys.forEach((key) => seen.add(key));
      return true;
    })
    .slice(0, limit);
}
