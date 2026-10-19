'use server';

import { getTopAnime, searchAnime } from '@/services/anime/anime.service';

const DEFAULT_PAGE_SIZE = 20;

function isVisibleAnime(item) {
  if (!item) return false;

  const format = String(item?.format || '').toUpperCase();
  const status = String(item?.status || '').toUpperCase();
  const hasIdentity = item?.anilistId || item?.malId;

  return hasIdentity && format === 'TV' && status !== 'NOT_YET_RELEASED' && status !== 'CANCELLED' && status !== 'HIATUS';
}

// Same flat shape AnimeCard already expects (see getanimeaction.js).
function mapAnime(item) {
  return {
    id: item.anilistId != null ? String(item.anilistId) : item.malId != null ? `mal-${item.malId}` : null,
    anilist_id: item.anilistId != null ? String(item.anilistId) : null,
    mal_id: item.malId != null ? String(item.malId) : null,
    title: item.title?.romaji || item.title?.english || item.title?.native || null,
    title_english: item.title?.english || item.title?.romaji || null,
    poster_image: item.poster || null,
    score: item.score ?? null,
    type: item.format || null,
    genres: item.genres ?? [],
    synopsis: item.description || null,
  };
}

/**
 * Advanced filtered search with retry logic, sourced from AniList (12h Redis cache).
 *
 * @param {object} filters - { query, genre, type, status, rating, year, season, orderBy, sort }
 * @param {number} page
 * @param {number} pageSize
 * @param {number} retries - number of retry attempts
 */
export async function searchAnimeAction(filters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE, retries = 2) {
  const safePage = Math.max(1, Number(page) || 1);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await searchAnime(filters.query || '', { page: safePage, perPage: pageSize });
      const items = (data.results ?? []).filter(isVisibleAnime).map(mapAnime);

      return {
        success: true,
        items,
        pagination: {
          page: safePage,
          pageSize,
          totalPages: data.pagination?.lastPage || 1,
          totalCount: items.length,
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(`[searchAnimeAction] Attempt ${attempt + 1} failed, retrying...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }

  console.error('[searchAnimeAction] metadata request failed.', { name: lastError?.name || 'Error' });
  return { error: 'Anime search is temporarily unavailable.', items: [] };
}

/**
 * Top-rated anime for the search page's sidebar widget, with retry logic.
 */
export async function getTopAnimeAction(page = 1, limit = 6, retries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await getTopAnime({ page, limit });
      const items = (data.results ?? []).filter(isVisibleAnime).slice(0, limit).map(mapAnime);
      return { success: true, items };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(`[getTopAnimeAction] Attempt ${attempt + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }

  console.error('[getTopAnimeAction] metadata request failed.', { name: lastError?.name || 'Error' });
  return { error: 'Top anime is temporarily unavailable.', items: [] };
}
