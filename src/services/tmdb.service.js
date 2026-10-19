import 'server-only';

import { deleteCached, getCached, setCached } from '@/services/Cache.service';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const MAX_PAGE = 500;
const inflight = new Map();

/** @typedef {'movie' | 'tv'} TmdbMediaType */
/** @typedef {{ id: number, media_type: TmdbMediaType | null, title: string, overview: string, poster_path: string | null, backdrop_path: string | null, release_date: string | null, first_air_date: string | null, vote_average: number | null, vote_count: number | null, genre_ids: number[], popularity: number | null }} TmdbMediaItem */
/** @typedef {{ page: number, results: TmdbMediaItem[], total_pages: number, total_results: number }} TmdbPage */
/** @typedef {{ id: number, name: string }} TmdbGenre */
/** @typedef {TmdbMediaItem & { original_title: string | null, tagline: string | null, status: string | null, runtime: number | null, episode_run_time: number[], number_of_episodes: number | null, number_of_seasons: number | null, genres: TmdbGenre[], seasons?: Array<{ id: number, season_number: number, name: string, overview: string, poster_path: string | null, air_date: string | null, episode_count: number }>, credits?: { cast: Array<{ id: number, name: string, character: string | null }>, crew: Array<{ id: number, name: string, job: string | null }> }, videos?: Array<{ key: string, site: string, name: string, type: string | null, official: boolean }>, recommendations?: TmdbMediaItem[], similar?: TmdbMediaItem[] }} TmdbDetails */

export const TMDB_TTL = Object.freeze({
  TRENDING: 15 * 60,
  POPULAR: 30 * 60,
  UPCOMING: 20 * 60,
  SEARCH: 10 * 60,
  DETAILS: 24 * 60 * 60,
  EPISODES: 12 * 60 * 60,
  GENRES: 7 * 24 * 60 * 60,
});

export class TmdbError extends Error {
  constructor(message, { status = null, retryAfter = null, code = 'TMDB_ERROR' } = {}) {
    super(message);
    this.name = 'TmdbError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.code = code;
  }
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TmdbError(`A valid ${label} is required.`, { code: 'INVALID_ARGUMENT' });
  }
  return parsed;
}

function pageNumber(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_PAGE) {
    throw new TmdbError('Page must be between 1 and 500.', { code: 'INVALID_ARGUMENT' });
  }
  return parsed;
}

function mediaType(value) {
  if (value !== 'movie' && value !== 'tv') {
    throw new TmdbError('Media type must be movie or tv.', { code: 'INVALID_ARGUMENT' });
  }
  return value;
}

function languageValue(value = 'en-US') {
  const language = String(value || 'en-US').trim();
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language)) {
    throw new TmdbError('Language must be a valid TMDB language tag.', { code: 'INVALID_ARGUMENT' });
  }
  return language;
}

function canonicalParams(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function makeCacheKey(path, params) {
  return `tmdb:v1:${path.replace(/^\/+/, '')}?${canonicalParams(params)}`;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function optionalString(value, maxLength = 20_000) {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGenre(value) {
  const genre = asObject(value);
  if (!genre || !Number.isSafeInteger(genre.id) || typeof genre.name !== 'string') return null;
  return { id: genre.id, name: genre.name.slice(0, 100) };
}

function normalizeMediaItem(value, defaultType = null) {
  const item = asObject(value);
  if (!item || !Number.isSafeInteger(item.id) || item.id <= 0) return null;
  const title = optionalString(item.title || item.name, 300);
  if (!title) return null;
  const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : item.media_type === 'movie' || item.release_date ? 'movie' : defaultType;
  // TMDB's multi-search also returns people. They are not playable media and
  // must not enter movie/TV cards or be assigned a guessed media type.
  if (type !== 'movie' && type !== 'tv') return null;
  return {
    id: item.id,
    media_type: type,
    title,
    overview: optionalString(item.overview, 10_000) || '',
    poster_path: optionalString(item.poster_path, 500),
    backdrop_path: optionalString(item.backdrop_path, 500),
    release_date: optionalString(item.release_date, 32),
    first_air_date: optionalString(item.first_air_date, 32),
    vote_average: finiteNumber(item.vote_average),
    vote_count: finiteNumber(item.vote_count),
    genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids.filter((id) => Number.isSafeInteger(id) && id > 0) : [],
    popularity: finiteNumber(item.popularity),
  };
}

function normalizeListResponse(value, defaultType = null) {
  const response = asObject(value);
  if (!response || !Array.isArray(response.results)) {
    throw new TmdbError('TMDB returned an invalid listings response.', { code: 'INVALID_RESPONSE' });
  }
  return {
    page: Number.isSafeInteger(response.page) ? response.page : 1,
    results: response.results.map((item) => normalizeMediaItem(item, defaultType)).filter(Boolean),
    total_pages: Number.isSafeInteger(response.total_pages) ? response.total_pages : 1,
    total_results: Number.isSafeInteger(response.total_results) ? response.total_results : 0,
  };
}

function normalizePeople(value) {
  const section = asObject(value);
  const cast = Array.isArray(section?.cast) ? section.cast : [];
  const crew = Array.isArray(section?.crew) ? section.crew : [];
  const mapPerson = (raw) => {
    const person = asObject(raw);
    if (!person || !Number.isSafeInteger(person.id) || typeof person.name !== 'string') return null;
    return {
      id: person.id,
      name: person.name.slice(0, 200),
      character: optionalString(person.character, 200),
      job: optionalString(person.job, 100),
      profile_path: optionalString(person.profile_path, 500),
      known_for_department: optionalString(person.known_for_department, 100),
    };
  };
  return { cast: cast.map(mapPerson).filter(Boolean).slice(0, 30), crew: crew.map(mapPerson).filter(Boolean).slice(0, 30) };
}

function normalizeVideos(value) {
  const videos = Array.isArray(asObject(value)?.results) ? value.results : [];
  return videos.map((raw) => {
    const video = asObject(raw);
    if (!video || typeof video.key !== 'string' || typeof video.site !== 'string') return null;
    return {
      key: video.key.slice(0, 100),
      site: video.site.slice(0, 40),
      name: optionalString(video.name, 300) || 'Trailer',
      type: optionalString(video.type, 80),
      official: video.official === true,
    };
  }).filter(Boolean).slice(0, 30);
}

function normalizeDetail(value, expectedId, type) {
  const raw = asObject(value);
  if (!raw || raw.id !== expectedId) {
    throw new TmdbError('TMDB returned an invalid title response.', { code: 'INVALID_RESPONSE' });
  }
  const title = optionalString(raw.title || raw.name, 300);
  if (!title) throw new TmdbError('TMDB title response has no title.', { code: 'INVALID_RESPONSE' });

  const output = {
    ...normalizeMediaItem({ ...raw, media_type: type }),
    original_title: optionalString(raw.original_title || raw.original_name, 300),
    tagline: optionalString(raw.tagline, 500),
    status: optionalString(raw.status, 100),
    runtime: Number.isSafeInteger(raw.runtime) && raw.runtime >= 0 ? raw.runtime : null,
    episode_run_time: Array.isArray(raw.episode_run_time) ? raw.episode_run_time.filter((n) => Number.isSafeInteger(n) && n >= 0) : [],
    number_of_episodes: Number.isSafeInteger(raw.number_of_episodes) ? raw.number_of_episodes : null,
    number_of_seasons: Number.isSafeInteger(raw.number_of_seasons) ? raw.number_of_seasons : null,
    genres: Array.isArray(raw.genres) ? raw.genres.map(normalizeGenre).filter(Boolean) : [],
    production_countries: Array.isArray(raw.production_countries) ? raw.production_countries.map((country) => optionalString(country?.name, 100)).filter(Boolean) : [],
  };

  if (raw.credits) output.credits = normalizePeople(raw.credits);
  if (raw.videos) output.videos = normalizeVideos(raw.videos);
  if (raw.recommendations) output.recommendations = normalizeListResponse(raw.recommendations, type).results;
  if (raw.similar) output.similar = normalizeListResponse(raw.similar, type).results;
  if (type === 'tv') {
    output.seasons = Array.isArray(raw.seasons) ? raw.seasons.map(normalizeSeason).filter(Boolean) : [];
    output.created_by = Array.isArray(raw.created_by) ? raw.created_by.map((person) => ({
      id: Number.isSafeInteger(person?.id) ? person.id : null,
      name: optionalString(person?.name, 200),
      profile_path: optionalString(person?.profile_path, 500),
    })).filter((person) => person.id && person.name) : [];
  }
  return output;
}

function normalizeSeason(value) {
  const season = asObject(value);
  if (!season || !Number.isSafeInteger(season.id) || !Number.isSafeInteger(season.season_number)) return null;
  return {
    id: season.id,
    season_number: season.season_number,
    name: optionalString(season.name, 200) || `Season ${season.season_number}`,
    overview: optionalString(season.overview, 10_000) || '',
    poster_path: optionalString(season.poster_path, 500),
    air_date: optionalString(season.air_date, 32),
    episode_count: Number.isSafeInteger(season.episode_count) ? season.episode_count : 0,
  };
}

function normalizeSeasonResponse(value, expectedSeason) {
  const season = asObject(value);
  if (!season || season.season_number !== expectedSeason || !Array.isArray(season.episodes)) {
    throw new TmdbError('TMDB returned an invalid season response.', { code: 'INVALID_RESPONSE' });
  }
  const normalizedSeason = normalizeSeason(season);
  if (!normalizedSeason) throw new TmdbError('TMDB returned an invalid season response.', { code: 'INVALID_RESPONSE' });
  return {
    ...normalizedSeason,
    episodes: season.episodes.map((raw) => {
      const episode = asObject(raw);
      if (!episode || !Number.isSafeInteger(episode.id) || !Number.isSafeInteger(episode.episode_number)) return null;
      return {
        id: episode.id,
        episode_number: episode.episode_number,
        name: optionalString(episode.name, 300) || `Episode ${episode.episode_number}`,
        overview: optionalString(episode.overview, 10_000) || '',
        still_path: optionalString(episode.still_path, 500),
        air_date: optionalString(episode.air_date, 32),
        vote_average: finiteNumber(episode.vote_average),
        runtime: Number.isSafeInteger(episode.runtime) && episode.runtime >= 0 ? episode.runtime : null,
      };
    }).filter(Boolean),
  };
}

function normalizeEpisodeResponse(value, expectedEpisode) {
  const episode = asObject(value);
  if (!episode || episode.episode_number !== expectedEpisode || !Number.isSafeInteger(episode.id)) {
    throw new TmdbError('TMDB returned an invalid episode response.', { code: 'INVALID_RESPONSE' });
  }
  return {
    id: episode.id,
    episode_number: episode.episode_number,
    season_number: Number.isSafeInteger(episode.season_number) ? episode.season_number : null,
    name: optionalString(episode.name, 300) || `Episode ${episode.episode_number}`,
    overview: optionalString(episode.overview, 10_000) || '',
    still_path: optionalString(episode.still_path, 500),
    air_date: optionalString(episode.air_date, 32),
    vote_average: finiteNumber(episode.vote_average),
    runtime: Number.isSafeInteger(episode.runtime) && episode.runtime >= 0 ? episode.runtime : null,
    guest_stars: normalizePeople({ cast: episode.guest_stars, crew: [] }).cast,
    crew: normalizePeople({ cast: [], crew: episode.crew }).crew,
  };
}

function normalizeGenresResponse(value) {
  const response = asObject(value);
  if (!response || !Array.isArray(response.genres)) {
    throw new TmdbError('TMDB returned an invalid genres response.', { code: 'INVALID_RESPONSE' });
  }
  return response.genres.map(normalizeGenre).filter(Boolean);
}

function validateCached(value, validator) {
  try {
    return validator(value);
  } catch {
    return null;
  }
}

async function fetchTmdb(path, params = {}) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new TmdbError('TMDB is not configured on the server.', { code: 'NOT_CONFIGURED' });

  const url = new URL(`${TMDB_API_BASE}/${path.replace(/^\/+/, '')}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw new TmdbError(timeout ? 'TMDB took too long to respond. Please try again.' : 'TMDB is temporarily unreachable. Please try again.', {
      code: timeout ? 'TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
    });
  }

  if (response.status === 429) {
    throw new TmdbError('TMDB is rate limiting requests. Please try again shortly.', {
      status: 429,
      retryAfter: response.headers.get('retry-after'),
      code: 'RATE_LIMITED',
    });
  }
  if (!response.ok) {
    const status = response.status;
    const notFound = status === 404;
    throw new TmdbError(notFound ? 'This title was not found on TMDB.' : status >= 500 ? 'TMDB is temporarily unavailable. Please try again.' : 'TMDB could not complete this request.', {
      status,
      code: notFound ? 'NOT_FOUND' : status >= 500 ? 'UPSTREAM_UNAVAILABLE' : 'REQUEST_REJECTED',
    });
  }

  try {
    return await response.json();
  } catch {
    throw new TmdbError('TMDB returned an unreadable response.', { status: response.status, code: 'INVALID_RESPONSE' });
  }
}

async function cachedRequest(path, params, ttlSeconds, validator) {
  const cacheKey = makeCacheKey(path, params);
  const cached = await getCached(cacheKey);
  if (cached !== null) {
    const validCached = validateCached(cached, validator);
    if (validCached) return { data: validCached, cache: 'hit' };
    await deleteCached(cacheKey);
  }

  if (inflight.has(cacheKey)) {
    return { data: await inflight.get(cacheKey), cache: 'inflight' };
  }

  const promise = (async () => {
    const raw = await fetchTmdb(path, params);
    const validated = validator(raw);
    await setCached(cacheKey, validated, ttlSeconds);
    return validated;
  })();
  inflight.set(cacheKey, promise);
  try {
    return { data: await promise, cache: 'miss' };
  } finally {
    inflight.delete(cacheKey);
  }
}

function languageAndPage(options = {}) {
  return { language: languageValue(options.language), page: pageNumber(options.page) };
}

function listValidator(defaultType = null) {
  return (value) => normalizeListResponse(value, defaultType);
}

/** @returns {Promise<TmdbPage>} */
export async function getTrending(media = 'all', options = {}) {
  if (!['movie', 'tv', 'all'].includes(media)) throw new TmdbError('Media type must be movie, tv, or all.', { code: 'INVALID_ARGUMENT' });
  const window = options.window === 'day' ? 'day' : 'week';
  const params = { ...languageAndPage(options) };
  const path = `trending/${media}/${window}`;
  return (await cachedRequest(path, params, TMDB_TTL.TRENDING, listValidator(media === 'all' ? null : media))).data;
}

/** @returns {Promise<TmdbPage>} */
export async function getPopular(type, options = {}) {
  const media = mediaType(type);
  const params = { ...languageAndPage(options), region: options.region };
  return (await cachedRequest(`${media}/popular`, params, TMDB_TTL.POPULAR, listValidator(media))).data;
}

/** @returns {Promise<TmdbPage>} */
export async function getTopRated(type, options = {}) {
  const media = mediaType(type);
  const params = { ...languageAndPage(options), region: options.region };
  return (await cachedRequest(`${media}/top_rated`, params, TMDB_TTL.POPULAR, listValidator(media))).data;
}

/** @returns {Promise<TmdbPage>} */
export async function getUpcomingMovies(options = {}) {
  const params = { ...languageAndPage(options), region: options.region };
  return (await cachedRequest('movie/upcoming', params, TMDB_TTL.UPCOMING, listValidator('movie'))).data;
}

/** @returns {Promise<TmdbPage>} */
export async function getOnTheAirTv(options = {}) {
  const params = { ...languageAndPage(options), timezone: options.timezone };
  return (await cachedRequest('tv/on_the_air', params, TMDB_TTL.UPCOMING, listValidator('tv'))).data;
}

/** @returns {Promise<TmdbGenre[]>} */
export async function getGenres(type, language = 'en-US') {
  const media = mediaType(type);
  const params = { language: languageValue(language) };
  return (await cachedRequest(`genre/${media}/list`, params, TMDB_TTL.GENRES, normalizeGenresResponse)).data;
}

/** @returns {Promise<TmdbPage>} */
export async function searchMoviesAndTv(query, options = {}) {
  const cleanQuery = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  if (!cleanQuery) return { page: 1, results: [], total_pages: 0, total_results: 0 };
  const params = {
    ...languageAndPage(options),
    query: cleanQuery,
    include_adult: options.includeAdult === true,
    region: options.region,
  };
  return (await cachedRequest('search/multi', params, TMDB_TTL.SEARCH, listValidator())).data;
}

/** @returns {Promise<TmdbPage>} */
export async function discoverMedia(type, options = {}) {
  const media = mediaType(type);
  const params = {
    ...languageAndPage(options),
    sort_by: options.sortBy || 'popularity.desc',
    with_genres: Array.isArray(options.genreIds) ? options.genreIds.filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0).map(Number).join(',') : options.genreIds,
    'vote_average.gte': options.minVote,
    'vote_count.gte': options.minVoteCount,
    'primary_release_year': media === 'movie' ? options.year : undefined,
    'first_air_date_year': media === 'tv' ? options.year : undefined,
  };
  return (await cachedRequest(`discover/${media}`, params, TMDB_TTL.POPULAR, listValidator(media))).data;
}

function detailValidator(id, type) {
  return (value) => normalizeDetail(value, id, type);
}

/** @returns {Promise<TmdbDetails>} */
export async function getMovieDetails(tmdbId, options = {}) {
  const id = positiveInteger(tmdbId, 'TMDB movie ID');
  const params = {
    language: languageValue(options.language),
    append_to_response: 'credits,videos,recommendations,similar',
  };
  return (await cachedRequest(`movie/${id}`, params, TMDB_TTL.DETAILS, detailValidator(id, 'movie'))).data;
}

/** @returns {Promise<TmdbDetails>} */
export async function getTvDetails(tmdbId, options = {}) {
  const id = positiveInteger(tmdbId, 'TMDB TV ID');
  const params = {
    language: languageValue(options.language),
    append_to_response: 'credits,videos,recommendations,similar',
  };
  return (await cachedRequest(`tv/${id}`, params, TMDB_TTL.DETAILS, detailValidator(id, 'tv'))).data;
}

/** @returns {Promise<{ id: number, season_number: number, name: string, episodes: Array<{ id: number, episode_number: number, name: string, overview: string }> }>} */
export async function getSeasonDetails(tvId, seasonNumber, options = {}) {
  const id = positiveInteger(tvId, 'TMDB TV ID');
  const season = Number(seasonNumber);
  if (!Number.isSafeInteger(season) || season < 0) throw new TmdbError('Season number must be a non-negative integer.', { code: 'INVALID_ARGUMENT' });
  const params = { language: languageValue(options.language), append_to_response: 'credits' };
  return (await cachedRequest(`tv/${id}/season/${season}`, params, TMDB_TTL.EPISODES, (data) => normalizeSeasonResponse(data, season))).data;
}

/** @returns {Promise<{ id: number, season_number: number | null, episode_number: number, name: string, overview: string }>} */
export async function getEpisodeDetails(tvId, seasonNumber, episodeNumber, options = {}) {
  const id = positiveInteger(tvId, 'TMDB TV ID');
  const season = Number(seasonNumber);
  const episode = Number(episodeNumber);
  if (!Number.isSafeInteger(season) || season < 0 || !Number.isSafeInteger(episode) || episode < 1) {
    throw new TmdbError('Season and episode numbers are invalid.', { code: 'INVALID_ARGUMENT' });
  }
  const params = { language: languageValue(options.language), append_to_response: 'credits' };
  return (await cachedRequest(`tv/${id}/season/${season}/episode/${episode}`, params, TMDB_TTL.EPISODES, (data) => normalizeEpisodeResponse(data, episode))).data;
}

export function tmdbImage(path, size = 'w500') {
  if (typeof path !== 'string' || !/^\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(path)) return null;
  const allowedSizes = new Set(['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original']);
  return `${IMAGE_BASE}/${allowedSizes.has(size) ? size : 'w500'}${path}`;
}

export function tmdbTrailerUrl(video) {
  if (video?.site !== 'YouTube' || typeof video.key !== 'string' || !/^[\w-]{6,20}$/.test(video.key)) return null;
  return `https://www.youtube-nocookie.com/embed/${video.key}`;
}

export function getTmdbErrorMessage(error) {
  if (error instanceof TmdbError) return error.message;
  return 'Movie and TV metadata is temporarily unavailable.';
}
