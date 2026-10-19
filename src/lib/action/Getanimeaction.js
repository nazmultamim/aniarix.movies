'use server';

import { getAnime, getFeaturedAnime, getReleasedAnime, getTopAnime, getTrendingAnime, searchAnime } from '@/services/anime/anime.service';
import { CACHE_TTL, getCached, setCached } from '@/services/Cache.service';
import { getAnimeDisplayTitle, getAnimeExternalIds, getAnimeTitleVariants, getStableAnimeIdentity } from '@/lib/anime-display';
import { slugify } from '@/lib/slugify';

const DEFAULT_PAGE_SIZE = 24;
const HERO_SLIDES_CACHE_KEY = 'hero-anime-slides:v9';
const SELECTED_ANIME_CACHE_PREFIX = 'selected-anime:v3';
const SLUG_MAP_PREFIX = 'slug-to-anilist:v1';
const TRENDING_ANIME_CACHE_PREFIX = 'trending-anime-list:v1';

function isBrowsableAnime(item) {
  const status = String(item?.status || '').toUpperCase();
  return status !== 'NOT_YET_RELEASED' && status !== 'CANCELLED' && status !== 'HIATUS';
}

function isTvAnimeWithAnilistId(item) {
  if (!item) return false;

  const format = String(item?.format || '').toUpperCase();
  const hasIdentity = item?.anilistId || item?.malId;

  return hasIdentity && isBrowsableAnime(item) && format === 'TV';
}

function hasHeroArtwork(item) {
  return [item?.banner, item?.banner_image, item?.poster, item?.poster_image]
    .some((image) => typeof image === 'string' && image.trim());
}

function heroString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function heroImage(...sources) {
  return sources.find((source) => typeof source === 'string' && source.trim()) || null;
}

function heroGenres(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((genre) => {
      if (typeof genre === 'string') return genre.trim();
      if (genre && typeof genre === 'object' && typeof genre.name === 'string') return genre.name.trim();
      return '';
    })
    .filter(Boolean);
}

function getStableAnimeId(item) {
  return getStableAnimeIdentity(item);
}

function formatHeroRating(score) {
  const numericScore = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(numericScore)) {
    return 'Top Pick';
  }

  const normalizedScore = numericScore > 10 ? numericScore / 10 : numericScore;
  return `${normalizedScore.toFixed(1)}/10`;
}

// Maps the normalized AniList anime object into the flat shape the UI expects.
function mapAnime(item) {
  return {
    id: getStableAnimeId(item),
    anilist_id: item.anilistId != null ? String(item.anilistId) : null,
    mal_id: item.malId != null ? String(item.malId) : null,
    // Keep the canonical identity available to new consumers while retaining
    // the existing snake_case fields for the current UI.
    anilistId: item.anilistId != null ? String(item.anilistId) : null,
    malId: item.malId != null ? String(item.malId) : null,
    slug: item.slug ?? slugify(item.title?.english || item.title?.romaji || item.title?.native || item.anilistId || item.malId),
    title: item.title?.romaji || item.title?.english || item.title?.native || null,
    title_english: item.title?.english || item.title?.romaji || null,
    title_japanese: item.title?.native || null,
    poster_image: item.poster || null,
    poster: item.poster || null,
    score: item.score ?? null,
    average_score: item.averageScore ?? item.score ?? null,
    mean_score: item.meanScore ?? null,
    popularity: item.popularity ?? null,
    favorites: item.favorites ?? null,
    type: item.format || null,
    source: item.source ?? null,
    episodes: item.episodes ?? null,
    status: item.status || null,
    airing: item.status === 'RELEASING',
    duration: item.duration ? `${item.duration} min` : null,
    rating: null,
    rank: null,
    year: item.seasonYear ?? null,
    season: item.season ?? null,
    season_year: item.seasonYear ?? null,
    season_int: null,
    genres: item.genres ?? [],
    genre: item.genres ?? [],
    synopsis: item.description || null,
    aired_from: item.startDate ?? null,
    aired_to: item.endDate ?? null,
    broadcast: item.broadcast ?? null,
    next_airing_episode: item.nextAiringEpisode ?? null,
    studios: item.studios ?? [],
    studio_names: item.studioNames ?? [],
    main_studios: item.mainStudios ?? [],
    tags: item.tags ?? [],
    hashtag: item.hashtag ?? null,
    country_of_origin: item.countryOfOrigin ?? null,
    is_adult: item.isAdult ?? false,
    site_url: item.siteUrl ?? null,
    trailer: item.trailer ?? null,
    banner: item.banner ?? null,
    banner_image: item.banner ?? null,
    // Only populated when this came from getAnimeDetails() — list-view
    // fetches (top/trending/released) never request relations, so this
    // will just be an empty array for those.
    relations: item.relations ?? [],
  };
}

function mapHeroSlide(item, label = 'Featured') {
  const { anilistId, malId } = getAnimeExternalIds(item);
  const titles = getAnimeTitleVariants(item);
  const title = getAnimeDisplayTitle(item);
  const posterImage = heroImage(item?.poster, item?.poster_image);
  const bannerImage = heroImage(item?.banner, item?.banner_image, posterImage);
  const genres = heroGenres(item?.genres ?? item?.genre);
  const status = heroString(item?.status);
  const format = heroString(item?.format ?? item?.type);
  const seasonYear = Number.isInteger(Number(item?.seasonYear)) ? Number(item.seasonYear) : null;

  if ((!anilistId && !malId) || !title || !bannerImage) return null;

  return {
    id: anilistId || `mal-${malId}`,
    anilist_id: anilistId,
    mal_id: malId,
    anilistId,
    malId,
    slug: heroString(item?.slug) || slugify(title),
    title,
    title_english: titles.english || title,
    title_romaji: titles.romaji || null,
    title_native: titles.native || null,
    subtitle: label,
    banner_image: bannerImage,
    banner: bannerImage,
    type: format || 'Anime',
    format: format || null,
    genre: genres,
    genres,
    synopsis: heroString(item?.description ?? item?.synopsis),
    description: heroString(item?.description ?? item?.synopsis),
    rating: formatHeroRating(item?.score),
    release: seasonYear || status || '',
    airing: status === 'RELEASING' ? 'Airing' : '',
    quality: item.episodes && Number(item.episodes) > 1 ? 'HD' : 'SD',
    episodes: item.episodes ?? null,
    status,
    score: item.score ?? null,
    year: seasonYear,
    poster_image: posterImage,
    poster: posterImage,
    cover: bannerImage,
    focalPoint: 'center 20%',
  };
}

function buildHeroSlides(items, label) {
  return (items ?? [])
    .filter(isBrowsableAnime)
    .filter(hasHeroArtwork)
    .map((item) => mapHeroSlide(item, label))
    .filter(Boolean);
}

function heroIdentityKeys(slide) {
  const { anilistId, malId } = getAnimeExternalIds(slide);
  return [
    anilistId ? `anilist:${anilistId}` : null,
    malId ? `mal:${malId}` : null,
  ].filter(Boolean);
}

function selectHeroSlides(items, label = 'Featured') {
  const seen = new Set();
  return buildHeroSlides(items, label)
    .filter((slide) => {
      const keys = heroIdentityKeys(slide);
      if (keys.length === 0 || keys.some((key) => seen.has(key))) return false;
      keys.forEach((key) => seen.add(key));
      return true;
    })
    .slice(0, 6);
}

async function fetchHeroAnimeSlides() {
  const featured = await getFeaturedAnime({ limit: 24 });
  return selectHeroSlides(featured, 'Featured');
}

/**
 * Paginated released-anime browse list, sourced from AniList (cached 12h in
 * Redis via anilist.service.js) — no Supabase involved, per the new
 * architecture.
 */
export async function getAnimeListAction({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const limit = Math.min(Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE), 25);
  const cacheKey = `released-anime:v3:${safePage}:${limit}`;
  const fallbackKeys = [
    cacheKey,
    safePage === 1 ? 'top-anime' : `top-anime:${safePage}`,
    'top-anime',
  ];

  try {
    const data = await getReleasedAnime({ page: safePage, limit });
    const items = (data.results ?? []).map(mapAnime).filter(Boolean);

    return {
      success: true,
      items,
      pagination: {
        page: safePage,
        pageSize: limit,
        totalPages: data.pagination?.lastPage || 1,
        totalCount: items.length,
      },
    };
  } catch (err) {
    try {
      const fallback = await getTopAnime({ page: safePage, limit });
      const items = (fallback.results ?? []).map(mapAnime);

      await setCached(
        cacheKey,
        {
          results: fallback.results ?? [],
          pagination: fallback.pagination ?? null,
        },
        CACHE_TTL.TWELVE_HOURS
      );

      return {
        success: true,
        items,
        pagination: {
          page: safePage,
          pageSize: limit,
          totalPages: fallback.pagination?.lastPage || 1,
          totalCount: items.length,
        },
      };
    } catch (fallbackErr) {
      console.error('[getAnimeListAction] fallback failed:', fallbackErr);

      for (const key of fallbackKeys) {
        const cached = await getCached(key);
        if (cached?.results?.length) {
          const items = (cached.results ?? []).map(mapAnime);
          return {
            success: true,
            items,
            pagination: {
              page: safePage,
              pageSize: limit,
              totalPages: cached.pagination?.lastPage || 1,
              totalCount: items.length,
            },
          };
        }
      }

      console.error('[getAnimeListAction] metadata request failed.', { name: err?.name || 'Error' });
      return { error: 'Anime metadata is temporarily unavailable.', items: [] };
    }
  }
}

export async function getReleasedAnimeAction({ page = 1, limit = 12 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 12), 25);
  const cacheKey = `released-anime:v3:${safePage}:${safeLimit}`;

  try {
    const data = await getReleasedAnime({ page: safePage, limit: safeLimit });
    const items = (data.results ?? []).map(mapAnime).filter(Boolean);

    return {
      success: true,
      items,
      pagination: {
        page: safePage,
        pageSize: safeLimit,
        totalPages: data.pagination?.lastPage || 1,
        totalCount: items.length,
      },
    };
  } catch (err) {
    const cached = await getCached(cacheKey);
    if (cached?.results?.length) {
      const items = (cached.results ?? []).map(mapAnime).filter(Boolean);
      return {
        success: true,
        items,
        pagination: {
          page: safePage,
          pageSize: safeLimit,
          totalPages: cached.pagination?.lastPage || 1,
          totalCount: items.length,
        },
      };
    }

    console.error('[getReleasedAnimeAction] metadata request failed.', { name: err?.name || 'Error' });
    return { error: 'Anime metadata is temporarily unavailable.', items: [] };
  }
}

export async function getHeroAnimeSlidesAction() {
  try {
    const cached = await getCached(HERO_SLIDES_CACHE_KEY);
    if (cached?.items?.length) {
      const items = selectHeroSlides(cached.items, 'Featured');
      if (items.length) return { success: true, items };
    }

    const items = await fetchHeroAnimeSlides();
    await setCached(
      HERO_SLIDES_CACHE_KEY,
      { items },
      CACHE_TTL.TWENTY_FOUR_HOURS
    );

    return { success: true, items };
  } catch (err) {
    console.error('[getHeroAnimeSlidesAction] failed:', err);

    return { error: 'Featured anime is temporarily unavailable.', items: [] };
  }
}

export async function getTrendingAnimeAction({ page = 1, limit = 12 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 12), 25);
  const cacheKey = `${TRENDING_ANIME_CACHE_PREFIX}:${safePage}:${safeLimit}`;

  try {
    const cached = await getCached(cacheKey);
    if (cached) {
      return {
        success: true,
        items: cached.items ?? [],
        pagination: cached.pagination ?? null,
      };
    }

    const data = await getTrendingAnime({ page: safePage, limit: safeLimit });
    const items = (data.results ?? [])
      .filter(isTvAnimeWithAnilistId)
      .map(mapAnime)
      .slice(0, safeLimit);

    const payload = {
      items,
      pagination: {
        page: safePage,
        pageSize: safeLimit,
        totalPages: data.pagination?.lastPage || 1,
        totalCount: items.length,
      },
    };

    await setCached(cacheKey, payload, CACHE_TTL.TWELVE_HOURS);

    return { success: true, ...payload };
  } catch (err) {
    console.error('[getTrendingAnimeAction] failed:', err);

    const cached = await getCached(cacheKey);
    if (cached) {
      return {
        success: true,
        items: cached.items ?? [],
        pagination: cached.pagination ?? null,
      };
    }

    return { error: 'Trending anime is temporarily unavailable.', items: [] };
  }
}

export async function cacheSelectedAnimeAction(anime) {
  // This action is also called by the featured carousel. `anime.id` is a UI
  // identifier there and may be a MAL ID, so it must never be assumed to be
  // an AniList ID.
  const anilistId = anime?.anilistId ?? anime?.anilist_id ?? null;
  const malId = anime?.malId ?? anime?.mal_id ?? null;
  if (!anilistId && !malId) {
    return { error: 'Anime ID is required.' };
  }

  const slug = anime?.slug || slugify(getAnimeDisplayTitle(anime, String(anilistId || malId)));

  const payload = {
    ...anime,
    anilist_id: anilistId != null ? String(anilistId) : null,
    mal_id: malId != null ? String(malId) : null,
    anilistId: anilistId != null ? String(anilistId) : null,
    malId: malId != null ? String(malId) : null,
    id: anime?.id ?? String(anilistId || malId),
    slug,
    genres: anime?.genres ?? anime?.genre ?? [],
    genre: anime?.genres ?? anime?.genre ?? [],
    poster_image: anime?.poster_image ?? anime?.poster ?? null,
    poster: anime?.poster_image ?? anime?.poster ?? null,
    banner: anime?.banner ?? anime?.banner_image ?? null,
    banner_image: anime?.banner_image ?? anime?.banner ?? null,
    cachedAt: Date.now(),
  };

  if (anilistId) {
    await setCached(
      `${SELECTED_ANIME_CACHE_PREFIX}:${String(anilistId)}`,
      payload,
      CACHE_TTL.TWELVE_HOURS
    );
  }

  await storeSlugMapping(slug, { anilistId, malId });

  return { success: true, anime: payload };
}

export async function storeSlugMapping(slug, { anilistId = null, malId = null } = {}) {
  if (!slug || (!anilistId && !malId)) return;
  await setCached(
    `${SLUG_MAP_PREFIX}:${slug}`,
    {
      anilistId: anilistId != null ? String(anilistId) : null,
      malId: malId != null ? String(malId) : null,
    },
    CACHE_TTL.TWELVE_HOURS
  );
}

export async function getAnimeIdBySlugAction(slug) {
  if (!slug) return { anilistId: null, malId: null };

  const normalizedSlug = String(slug).trim();
  if (/^\d+$/.test(normalizedSlug)) {
    // Existing numeric watch URLs are AniList IDs and must remain so.
    return { anilistId: normalizedSlug, malId: null };
  }

  const malRouteMatch = normalizedSlug.match(/^mal-(\d+)$/i);
  if (malRouteMatch) {
    return { anilistId: null, malId: malRouteMatch[1] };
  }

  const cached = await getCached(`${SLUG_MAP_PREFIX}:${slug}`);
  if (cached?.anilistId || cached?.malId) {
    return {
      anilistId: cached.anilistId != null ? String(cached.anilistId) : null,
      malId: cached.malId != null ? String(cached.malId) : null,
    };
  }

  try {
    const searchTitle = normalizedSlug.replace(/-/g, ' ');
    const result = await searchAnime(searchTitle, { page: 1, perPage: 5 });
    const candidates = result?.results || [];

    for (const candidate of candidates) {
      const titles = [candidate.title?.romaji, candidate.title?.english, candidate.title?.native].filter(Boolean);

      for (const title of titles) {
        const candidateSlug = slugify(title);
        if (candidateSlug === slug) {
          if (!candidate.anilistId && !candidate.malId) return { anilistId: null, malId: null };
          const identity = {
            anilistId: candidate.anilistId != null ? String(candidate.anilistId) : null,
            malId: candidate.malId != null ? String(candidate.malId) : null,
          };
          await storeSlugMapping(slug, identity);
          return identity;
        }
      }
    }

    if (candidates[0]?.anilistId || candidates[0]?.malId) {
      const identity = {
        anilistId: candidates[0].anilistId != null ? String(candidates[0].anilistId) : null,
        malId: candidates[0].malId != null ? String(candidates[0].malId) : null,
      };
      await storeSlugMapping(slug, identity);
      return identity;
    }
  } catch (err) {
    console.error('[getAnimeIdBySlugAction] Failed to resolve slug:', slug, err);
  }

  return { anilistId: null, malId: null };
}

export async function getSelectedAnimeCacheAction(anilistId) {
  if (!anilistId) {
    return { anime: null };
  }

  const cached = await getCached(`${SELECTED_ANIME_CACHE_PREFIX}:${String(anilistId)}`);
  return { anime: cached || null };
}

/**
 * Full anime detail view for /anime/[anilist_id].
 */
export async function getAnimeDetailAction(identityOrAniListId) {
  const identity = typeof identityOrAniListId === 'object' && identityOrAniListId !== null
    ? identityOrAniListId
    : { anilistId: identityOrAniListId };
  if (!identity.anilistId && !identity.malId) {
    return { error: 'Anime identity is required.' };
  }

  try {
    const data = await getAnime(identity);
    return { anime: mapAnime(data) };
  } catch (err) {
    const cached = identity.anilistId
      ? await getCached(`${SELECTED_ANIME_CACHE_PREFIX}:${String(identity.anilistId)}`)
      : null;
    if (cached) {
      return { anime: cached, error: 'Showing saved anime details while live metadata is unavailable.' };
    }

    console.error('[getAnimeDetailAction] metadata request failed.', { name: err?.name || 'Error' });
    return { error: 'Anime metadata is temporarily unavailable.' };
  }
}
