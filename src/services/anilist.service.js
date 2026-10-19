import { getOrSetCache, CACHE_TTL } from './Cache.service';
import { graphqlRequest, AniListApiError } from '@/graphql/client';
import { MEDIA_DETAIL_QUERY, MEDIA_PAGE_QUERY } from '@/graphql/queries';
import { slugify } from '@/lib/slugify';
import { normalizeAnimeScore } from '@/lib/anime-score';

export { AniListApiError } from '@/graphql/client';

const DEFAULT_PAGE_SIZE = 20;

function getQueryPageSize(requestedSize) {
  return Math.min(25, Math.max(1, Number(requestedSize) || DEFAULT_PAGE_SIZE));
}

function stripHtml(value) {
  if (!value) return null;

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFuzzyDate(date) {
  if (!date) return null;
  const { year, month, day } = date;
  if (!year && !month && !day) return null;

  const parts = [];
  if (month && day && year) {
    const asDate = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toISOString();
    }
  }

  if (year) parts.push(String(year));
  if (month) parts.push(String(month).padStart(2, '0'));
  if (day) parts.push(String(day).padStart(2, '0'));
  return parts.join('-');
}

function formatBroadcast(broadcast) {
  if (!broadcast?.day || !broadcast?.time) return null;
  return `${String(broadcast.day).toLowerCase()}s at ${broadcast.time}${broadcast.timezone ? ` ${broadcast.timezone}` : ''}`;
}

function mapSeason(season) {
  if (!season) return null;
  const normalized = String(season).toLowerCase();
  const seasons = {
    winter: 'WINTER',
    spring: 'SPRING',
    summer: 'SUMMER',
    fall: 'FALL',
  };
  return seasons[normalized] || null;
}

function mapStatus(status) {
  if (!status) return null;
  const normalized = String(status).trim().toLowerCase();
  const statuses = {
    airing: 'RELEASING',
    release: 'RELEASING',
    ongoing: 'RELEASING',
    complete: 'FINISHED',
    completed: 'FINISHED',
    finished: 'FINISHED',
    upcoming: 'NOT_YET_RELEASED',
  };
  return statuses[normalized] || null;
}

function normalizeGenre(genre) {
  if (!genre) return null;

  const normalized = String(genre).trim().toLowerCase();
  const genres = {
    action: 'Action',
    adventure: 'Adventure',
    comedy: 'Comedy',
    drama: 'Drama',
    fantasy: 'Fantasy',
    horror: 'Horror',
    isekai: 'Isekai',
    mecha: 'Mecha',
    mystery: 'Mystery',
    romance: 'Romance',
    'sci-fi': 'Sci-Fi',
    'slice of life': 'Slice of Life',
    sports: 'Sports',
    supernatural: 'Supernatural',
    thriller: 'Thriller',
  };

  return genres[normalized] || String(genre).trim();
}

function isReleasedMedia(item) {
  const status = String(item?.status || '').toUpperCase();
  return status !== 'NOT_YET_RELEASED' && status !== 'CANCELLED' && status !== 'HIATUS';
}

function mapFormat(format) {
  if (!format) return null;
  const normalized = String(format).toLowerCase();
  const formats = {
    tv: 'TV',
    movie: 'MOVIE',
    ova: 'OVA',
    special: 'SPECIAL',
    ona: 'ONA',
    music: 'MUSIC',
  };
  return formats[normalized] || null;
}

function mapSort(orderBy, sort = 'desc') {
  const normalizedOrder = String(orderBy || 'popularity').toLowerCase();
  const direction = String(sort || 'desc').toLowerCase() === 'asc' ? '' : '_DESC';

  const sorts = {
    popularity: `POPULARITY${direction}`,
    score: `SCORE${direction}`,
    start_date: `START_DATE${direction}`,
    startdate: `START_DATE${direction}`,
    id: `ID${direction}`,
    title: 'TITLE_ROMAJI',
    trending: 'TRENDING_DESC',
    search: 'SEARCH_MATCH',
  };

  return sorts[normalizedOrder] || `POPULARITY${direction}`;
}

// Maps AniList's relations edges into a flat array the UI can render
// directly. Only ANIME-type nodes are kept — relations can also point to
// MANGA/NOVEL/etc. (e.g. the source material an anime was adapted from),
// which aren't watchable and don't belong in a "related anime" list.
function normalizeRelations(relationsConnection) {
  const edges = relationsConnection?.edges;
  if (!Array.isArray(edges)) return [];

  return edges
    .filter((edge) => edge?.node?.type === 'ANIME')
    .map((edge) => {
      const node = edge.node;
      const title = node.title || {};
      return {
        relation_type: edge.relationType || null,
        anilist_id: node.id ?? null,
        title: title.english || title.romaji || title.native || null,
        poster: node.coverImage?.extraLarge || node.coverImage?.large || null,
        format: node.format || null,
        status: node.status || null,
        episodes: node.episodes ?? null,
        year: node.startDate?.year ?? null,
      };
    })
    .filter((rel) => rel.anilist_id && rel.title);
}

function normalizeMedia(item) {
  if (!item) return null;
  const title = item.title || {};
  const studios = (item.studios?.nodes || [])
    .filter((node) => node?.name)
    .map((node) => ({
      name: node.name,
      isMain: Boolean(node.isMain),
    }));
  const mainStudios = studios.filter((studio) => studio.isMain).map((studio) => studio.name);
  const allStudios = studios.map((studio) => studio.name);
  const topTags = Array.isArray(item.tags)
    ? item.tags
        .filter((tag) => tag?.name)
        .slice()
        .sort((a, b) => Number(b?.rank || 0) - Number(a?.rank || 0))
    : [];
  const trailer = item.trailer;
  const slug = slugify(title.romaji || title.english || title.native || item.id || `anilist-${item.id}`);
  const anilistId = item.id ?? null;
  const startDate = formatFuzzyDate(item.startDate);
  const endDate = formatFuzzyDate(item.endDate);

  return {
    id: anilistId != null ? String(anilistId) : slug,
    anilist_id: anilistId,
    slug,
    title: title.romaji || title.english || title.native || null,
    title_english: title.english || null,
    title_native: title.native || null,
    description: stripHtml(item.description),
    genres: Array.isArray(item.genres) ? item.genres : [],
    episodes: item.episodes ?? null,
    duration: item.duration ?? null,
    score: normalizeAnimeScore(item.averageScore ?? item.meanScore ?? null),
    average_score: normalizeAnimeScore(item.averageScore ?? null),
    mean_score: normalizeAnimeScore(item.meanScore ?? null),
    popularity: item.popularity ?? null,
    favorites: item.favourites ?? null,
    season: item.season || null,
    season_year: item.seasonYear ?? null,
    season_int: item.seasonInt ?? null,
    status: item.status || null,
    poster: item.coverImage?.extraLarge || null,
    banner: item.bannerImage || null,
    studios,
    studio_names: allStudios,
    main_studios: mainStudios,
    source: item.source || null,
    hashtag: item.hashtag || null,
    country_of_origin: item.countryOfOrigin || null,
    is_adult: Boolean(item.isAdult),
    start_date: startDate,
    end_date: endDate,
    broadcast: formatBroadcast(item.broadcast),
    next_airing_episode: item.nextAiringEpisode
      ? {
          episode: item.nextAiringEpisode.episode ?? null,
          airingAt: item.nextAiringEpisode.airingAt ?? null,
          timeUntilAiring: item.nextAiringEpisode.timeUntilAiring ?? null,
        }
      : null,
    tags: topTags.map((tag) => ({
      name: tag.name,
      rank: tag.rank ?? null,
      category: tag.category ?? null,
    })),
    trailer: trailer?.site === 'youtube' && trailer?.id
      ? `https://www.youtube.com/watch?v=${trailer.id}`
      : trailer?.site === 'youtube' && trailer?.thumbnail
        ? trailer.thumbnail
        : null,
    youtubeTrailer: trailer?.site === 'youtube' && trailer?.id
      ? trailer.id
      : null,
    format: item.format || null,
    site_url: item.siteUrl || null,
    // Only present when this came from MEDIA_DETAIL_QUERY (relations is
    // not requested by MEDIA_PAGE_QUERY / list views) — see queries.js.
    relations: normalizeRelations(item.relations),
  };
}

function normalizePagination(pageInfo, page = 1, perPage = DEFAULT_PAGE_SIZE) {
  if (!pageInfo) {
    return {
      currentPage: page,
      lastPage: 1,
      hasNextPage: false,
      total: 0,
    };
  }

  const normalizedPerPage = Math.max(1, Number(perPage) || DEFAULT_PAGE_SIZE);

  return {
    currentPage: page,
    lastPage: pageInfo.total ? Math.max(1, Math.ceil(pageInfo.total / normalizedPerPage)) : 1,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    total: pageInfo.total ?? 0,
  };
}

function buildPageVariables(page, perPage, filters = {}) {
  const variables = {
    page: Number(page) || 1,
    perPage: Math.min(Math.max(Number(perPage) || DEFAULT_PAGE_SIZE, 1), 25),
  };

  const search = String(filters.query || filters.search || filters.title || '').trim();
  if (search) variables.search = search;

  const genre = normalizeGenre(filters.genre || filters.genres?.[0] || null);
  if (genre) variables.genres = [genre];

  const explicitFormat = String(filters.format || filters.type || filters.mediaFormat || '').trim() || null;
  const format = mapFormat(explicitFormat);

  if (format) {
    variables.format = format;
  } else if (!explicitFormat) {
    // Only default to TV if no format was specified at all
    variables.format = 'TV';
  }
  // If explicitFormat was set but mapFormat returned null (unknown format), don't filter by format

  const status = mapStatus(filters.status || null);
  if (status) {
    variables.status = status;
  } else {
    variables.status_not = 'NOT_YET_RELEASED';
  }

  const season = mapSeason(filters.season || null);
  if (season) variables.season = season;

  const seasonYear = filters.seasonYear || filters.year || null;
  if (seasonYear) variables.seasonYear = Number(seasonYear);

  const country = filters.country || filters.countryOfOrigin || null;
  if (country) variables.countryOfOrigin = String(country).toUpperCase();

  const minScore = filters.minScore ?? filters.minimumScore ?? filters.averageScore ?? null;
  if (minScore != null && minScore !== '') variables.averageScore_greater = Number(minScore);

  const episodes = filters.episodes || filters.episodeCount || null;
  if (episodes != null && episodes !== '') variables.episodes_greater = Number(episodes);

  if (Object.prototype.hasOwnProperty.call(filters, 'adult')) {
    variables.isAdult = Boolean(filters.adult);
  }

  // Map rating filter to isAdult since AniList doesn't have a direct rating filter
  const rating = String(filters.rating || '').trim().toLowerCase() || null;
  if (rating === 'rx') {
    variables.isAdult = true;
  } else if (rating && rating !== '') {
    variables.isAdult = false;
  }

  const sortValue = mapSort(filters.orderBy || filters.sortBy || 'popularity', filters.sort || 'desc');
  if (sortValue) variables.sort = [sortValue];

  return variables;
}

export async function getAnimeDetails(anilistId) {
  if (!anilistId) throw new AniListApiError('anilistId is required', 400);

  const normalizedAnilistId = Number(anilistId);
  if (!Number.isFinite(normalizedAnilistId)) {
    throw new AniListApiError('anilistId must be a valid number', 400);
  }

  const key = `anime:v4:${normalizedAnilistId}`;
  const { data } = await getOrSetCache(
    key,
    async () => {
      const result = await graphqlRequest(MEDIA_DETAIL_QUERY, {
        id: normalizedAnilistId,
      });
      return normalizeMedia(result?.Media);
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export async function searchAnime(query, page = 1) {
  const trimmed = query?.toString().trim();
  if (!trimmed) return { results: [], pagination: null };

  const key = `search:${trimmed.toLowerCase()}:${page}`;
  const { data } = await getOrSetCache(
    key,
    async () => {
      const requestedPageSize = 20;
      const result = await graphqlRequest(MEDIA_PAGE_QUERY, {
        ...buildPageVariables(page, getQueryPageSize(requestedPageSize), { query: trimmed, sort: 'desc', orderBy: 'popularity' }),
      });
      const pageResult = result?.Page;
      const items = (pageResult?.media || [])
        .filter(isReleasedMedia)
        .map(normalizeMedia)
        .filter(Boolean)
        .slice(0, requestedPageSize);
      return {
        results: items,
        pagination: normalizePagination(pageResult?.pageInfo, page, requestedPageSize),
      };
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export async function getTopAnime(page = 1) {
  const key = page === 1 ? 'top-anime' : `top-anime:${page}`;
  const { data } = await getOrSetCache(
    key,
    async () => {
      const requestedPageSize = 20;
      const result = await graphqlRequest(MEDIA_PAGE_QUERY, {
        ...buildPageVariables(page, getQueryPageSize(requestedPageSize), { orderBy: 'score', sort: 'desc' }),
      });
      const pageResult = result?.Page;
      const items = (pageResult?.media || [])
        .filter(isReleasedMedia)
        .map(normalizeMedia)
        .filter(Boolean)
        .slice(0, requestedPageSize);
      return {
        results: items,
        pagination: normalizePagination(pageResult?.pageInfo, page, requestedPageSize),
      };
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export async function getSeasonalAnime(year, season, page = 1) {
  if (!year || !season) throw new AniListApiError('year and season are required', 400);

  const key = `season:${year}:${season}`;
  const { data } = await getOrSetCache(
    key,
    async () => {
      const requestedPageSize = 20;
      const result = await graphqlRequest(MEDIA_PAGE_QUERY, {
        ...buildPageVariables(page, getQueryPageSize(requestedPageSize), { year, season, orderBy: 'popularity', sort: 'desc' }),
      });
      const pageResult = result?.Page;
      const items = (pageResult?.media || [])
        .filter(isReleasedMedia)
        .map(normalizeMedia)
        .filter(Boolean)
        .slice(0, requestedPageSize);
      return {
        results: items,
        pagination: normalizePagination(pageResult?.pageInfo, page, requestedPageSize),
      };
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export async function getTrendingAnime(page = 1, limit = 20) {
  const safePage = Math.max(1, Number(page) || 1);
  const requestedPageSize = Math.min(Math.max(1, Number(limit) || 20), 25);
  const key =
    safePage === 1 && requestedPageSize === 20
      ? 'trending-anime'
      : `trending-anime:${safePage}:${requestedPageSize}`;
  const { data } = await getOrSetCache(
    key,
    async () => {
      const result = await graphqlRequest(MEDIA_PAGE_QUERY, {
        ...buildPageVariables(safePage, getQueryPageSize(requestedPageSize), { orderBy: 'trending', sort: 'desc' }),
      });
      const pageResult = result?.Page;
      const items = (pageResult?.media || [])
        .filter(isReleasedMedia)
        .map(normalizeMedia)
        .filter(Boolean)
        .slice(0, requestedPageSize);
      return {
        results: items,
        pagination: normalizePagination(pageResult?.pageInfo, safePage, requestedPageSize),
      };
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export async function getReleasedAnime(page = 1, limit = 24) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 24), 25);
  const key = `released-anime:v3:${safePage}:${safeLimit}`;

  const { data } = await getOrSetCache(
    key,
    async () => {
      const result = await graphqlRequest(MEDIA_PAGE_QUERY, {
        ...buildPageVariables(safePage, getQueryPageSize(safeLimit), {
          orderBy: 'id',
          sort: 'desc',
        }),
      });
      const pageResult = result?.Page;
      const items = (pageResult?.media || [])
        .filter(isReleasedMedia)
        .map(normalizeMedia)
        .filter(Boolean)
        .slice(0, safeLimit);
      return {
        results: items,
        pagination: normalizePagination(pageResult?.pageInfo, safePage, safeLimit),
      };
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export async function searchAnimeAdvanced(filters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const normalizedPageSize = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), 25);
  const keyParts = [filters.query, filters.genre, filters.type, filters.status, filters.rating, filters.year, filters.season, filters.orderBy, filters.sort]
    .map((value) => (value ?? '').toString().toLowerCase().trim());
  const cacheKey = `search-adv:${keyParts.join('|')}:${page}:${normalizedPageSize}`;

  const { data } = await getOrSetCache(
    cacheKey,
    async () => {
      const result = await graphqlRequest(MEDIA_PAGE_QUERY, {
        ...buildPageVariables(page, getQueryPageSize(normalizedPageSize), filters),
      });
      const pageResult = result?.Page;
      const items = (pageResult?.media || [])
        .filter(isReleasedMedia)
        .map(normalizeMedia)
        .filter(Boolean)
        .slice(0, normalizedPageSize);
      return {
        results: items,
        pagination: normalizePagination(pageResult?.pageInfo, page, normalizedPageSize),
      };
    },
    CACHE_TTL.TWELVE_HOURS
  );

  return data;
}

export const GENRE_IDS = {
  Action: 1,
  Adventure: 2,
  Comedy: 4,
  Drama: 8,
  Fantasy: 10,
  Horror: 14,
  Isekai: 62,
  Mecha: 18,
  Mystery: 7,
  Romance: 22,
  'Sci-Fi': 24,
  'Slice of Life': 36,
  Sports: 30,
  Supernatural: 37,
  Thriller: 41,
};
