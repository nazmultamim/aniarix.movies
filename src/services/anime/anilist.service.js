import { graphqlRequest, AniListApiError } from '@/graphql/client';
import { MEDIA_DETAIL_QUERY, MEDIA_PAGE_QUERY } from '@/graphql/queries';
import { normalizeAniListAnime } from './anime-normalizer';

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AniListApiError(`${fieldName} must be a positive integer`, 400);
  }
  return parsed;
}

function normalizePageInfo(pageInfo, page, perPage) {
  const total = Number(pageInfo?.total) || 0;
  return {
    currentPage: Number(pageInfo?.currentPage) || page,
    hasNextPage: Boolean(pageInfo?.hasNextPage),
    total,
    lastPage: total > 0 ? Math.ceil(total / perPage) : 1,
  };
}

function buildListVariables({ page = 1, perPage = 20, query, sort = ['POPULARITY_DESC'], status, format = 'TV', season, seasonYear, filters = {} } = {}) {
  const variables = { page: toPositiveInteger(page, 'page'), perPage: Math.min(toPositiveInteger(perPage, 'perPage'), 25), sort };
  const search = String(query || filters.query || '').trim();
  if (search) variables.search = search;
  if (status) variables.status = status;
  if (format) variables.format = format;
  if (season) variables.season = season;
  if (seasonYear) variables.seasonYear = Number(seasonYear);
  if (filters.genre) variables.genres = [filters.genre];
  if (filters.year) variables.seasonYear = Number(filters.year);
  if (filters.country) variables.countryOfOrigin = String(filters.country).toUpperCase();
  if (filters.minScore != null) variables.averageScore_greater = Number(filters.minScore);
  return variables;
}

/** Return a normalized AniList collection; no raw GraphQL Media escapes this module. */
export async function getAnimeCollectionFromAniList(options = {}) {
  const variables = buildListVariables(options);
  const result = await graphqlRequest(MEDIA_PAGE_QUERY, variables);
  const pageResult = result?.Page;
  if (!pageResult || !Array.isArray(pageResult.media)) {
    throw new AniListApiError('AniList returned a malformed collection response', 502);
  }
  return {
    results: pageResult.media.map(normalizeAniListAnime).filter(Boolean),
    pagination: normalizePageInfo(pageResult.pageInfo, variables.page, variables.perPage),
  };
}

/** Fetch one anime from AniList by AniList ID. */
export async function getAnimeFromAniList(anilistId) {
  const id = toPositiveInteger(anilistId, 'anilistId');
  const result = await graphqlRequest(MEDIA_DETAIL_QUERY, { id });
  const anime = normalizeAniListAnime(result?.Media);

  if (!anime?.anilistId) {
    throw new AniListApiError(`AniList anime ${id} was not found`, 404);
  }

  return anime;
}

/** Search AniList and return only normalized internal anime objects. */
export async function searchAnimeWithAniList(query, { page = 1, perPage = 20 } = {}) {
  const search = String(query || '').trim();
  if (!search) return { results: [], pagination: normalizePageInfo(null, 1, 20) };

  return getAnimeCollectionFromAniList({ page, perPage, query: search, sort: ['SEARCH_MATCH'], format: null });
}

export { AniListApiError };
