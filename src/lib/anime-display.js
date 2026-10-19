/**
 * Client- and server-safe helpers for the normalized anime model.
 * These deliberately accept the older flat UI shape as well, so cached
 * results and normalized metadata can be rendered together safely.
 */
function scalar(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

function numericId(value) {
  const normalized = scalar(value);
  return normalized && /^\d+$/.test(normalized) ? normalized : null;
}

export function getAnimeDisplayTitle(anime, fallback = '') {
  const titles = getAnimeTitleVariants(anime);
  return titles.english || titles.romaji || titles.native || fallback;
}

export function getAnimeTitleVariants(anime) {
  const title = anime?.title;
  const normalizedTitle = typeof title === 'object' && title !== null ? title : null;

  return {
    english: scalar(anime?.title_english ?? anime?.titleEnglish ?? normalizedTitle?.english),
    romaji: scalar(anime?.title_romaji ?? anime?.titleRomaji ?? normalizedTitle?.romaji ?? (typeof title === 'string' ? title : null)),
    native: scalar(anime?.title_native ?? anime?.titleNative ?? normalizedTitle?.native),
  };
}

export function getAnimeExternalIds(anime) {
  return {
    anilistId: numericId(anime?.anilistId ?? anime?.anilist_id),
    malId: numericId(anime?.malId ?? anime?.mal_id),
  };
}

/**
 * Returns a namespaced, stable key for React lists and cache-adjacent UI.
 * It never serializes an object, so normalized `title` objects cannot turn
 * into the duplicate "[object Object]" key.
 */
export function getStableAnimeIdentity(anime, fallbackIdentity = 'anime:unidentified') {
  const { anilistId, malId } = getAnimeExternalIds(anime);
  if (anilistId) return `anilist:${anilistId}`;

  if (malId) return `mal:${malId}`;

  const catalogId = scalar(anime?.catalogId ?? anime?.catalog_id ?? anime?.catalog?.id);
  if (catalogId) return `catalog:${catalogId}`;

  // Older flat action results use `id`; accept only a scalar and keep it
  // behind explicit provider/catalog identities.
  const legacyId = scalar(anime?.id);
  if (legacyId) return `id:${legacyId}`;

  const slug = scalar(anime?.slug);
  if (slug) return `slug:${slug}`;

  const title = getAnimeDisplayTitle(anime);
  if (title) return `title:${title.toLocaleLowerCase().replace(/\s+/g, ' ')}`;

  return scalar(fallbackIdentity) || 'anime:unidentified';
}
