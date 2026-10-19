function toNullableInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
    .trim() || null;
}

function normalizeAniListGenres(genres) {
  return Array.isArray(genres)
    ? genres.filter((genre) => typeof genre === 'string' && genre.trim())
    : [];
}

function normalizeJikanGenres(anime) {
  const groups = [anime?.genres, anime?.explicit_genres, anime?.themes, anime?.demographics];
  const seen = new Set();

  return groups.flatMap((group) => (Array.isArray(group) ? group : []))
    .map((genre) => genre?.name)
    .filter((genre) => typeof genre === 'string' && genre.trim())
    .filter((genre) => {
      const key = genre.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeJikanFormat(type) {
  if (!type) return null;

  const formats = {
    tv: 'TV',
    movie: 'MOVIE',
    ova: 'OVA',
    ona: 'ONA',
    special: 'SPECIAL',
    music: 'MUSIC',
  };

  return formats[String(type).toLowerCase()] || String(type).toUpperCase();
}

function normalizeJikanStatus(status) {
  if (!status) return null;

  const statuses = {
    'currently airing': 'RELEASING',
    'finished airing': 'FINISHED',
    'not yet aired': 'NOT_YET_RELEASED',
  };

  return statuses[String(status).toLowerCase()] || String(status).toUpperCase();
}

function normalizeJikanDuration(anime) {
  if (Number.isInteger(anime?.duration)) return anime.duration;

  const match = String(anime?.duration || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

/**
 * Convert an AniList Media response to the source-independent internal model.
 */
export function normalizeAniListAnime(anime) {
  if (!anime || typeof anime !== 'object') return null;

  const title = anime.title || {};

  return {
    anilistId: toNullableInteger(anime.id),
    malId: toNullableInteger(anime.idMal),
    title: {
      english: title.english || null,
      romaji: title.romaji || null,
      native: title.native || null,
    },
    poster: anime.coverImage?.extraLarge || anime.coverImage?.large || null,
    banner: anime.bannerImage || null,
    description: stripHtml(anime.description),
    format: anime.format || null,
    status: anime.status || null,
    episodes: toNullableInteger(anime.episodes),
    duration: toNullableInteger(anime.duration),
    season: anime.season || null,
    seasonYear: toNullableInteger(anime.seasonYear),
    genres: normalizeAniListGenres(anime.genres),
    source: 'anilist',
  };
}

/**
 * Convert a Jikan anime payload to the source-independent internal model.
 * Jikan does not provide an AniList ID; callers may supply a known mapping.
 */
export function normalizeJikanAnime(anime, { anilistId = null } = {}) {
  if (!anime || typeof anime !== 'object') return null;

  return {
    anilistId: toNullableInteger(anilistId),
    malId: toNullableInteger(anime.mal_id),
    title: {
      english: anime.title_english || null,
      romaji: anime.title || null,
      native: anime.title_japanese || null,
    },
    poster: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || null,
    banner: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || null,
    description: stripHtml(anime.synopsis),
    format: normalizeJikanFormat(anime.type),
    status: normalizeJikanStatus(anime.status),
    episodes: toNullableInteger(anime.episodes),
    duration: normalizeJikanDuration(anime),
    season: anime.season ? String(anime.season).toUpperCase() : null,
    seasonYear: toNullableInteger(anime.year),
    genres: normalizeJikanGenres(anime),
    source: 'jikan',
  };
}
