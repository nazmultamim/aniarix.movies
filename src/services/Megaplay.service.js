const MEGAPLAY_BASE_URL = 'https://megaplay.buzz';

export const STREAM_LANGUAGES = {
  SUB: 'sub',
  DUB: 'dub',
};

function normalizePositiveId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeEpisode(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeLanguage(language) {
  return language === STREAM_LANGUAGES.DUB ? STREAM_LANGUAGES.DUB : STREAM_LANGUAGES.SUB;
}

/** Build MegaPlay's AniList-specific stream URL. */
export function buildAniListStreamUrl(anilistId, episode, language = STREAM_LANGUAGES.SUB) {
  const id = normalizePositiveId(anilistId);
  const episodeNumber = normalizeEpisode(episode);
  if (!id || !episodeNumber) return null;

  return `${MEGAPLAY_BASE_URL}/stream/ani/${id}/${episodeNumber}/${normalizeLanguage(language)}`;
}

/** Build MegaPlay's MAL-specific stream URL. */
export function buildMalStreamUrl(malId, episode, language = STREAM_LANGUAGES.SUB) {
  const id = normalizePositiveId(malId);
  const episodeNumber = normalizeEpisode(episode);
  if (!id || !episodeNumber) return null;

  return `${MEGAPLAY_BASE_URL}/stream/mal/${id}/${episodeNumber}/${normalizeLanguage(language)}`;
}

/**
 * Select the appropriate MegaPlay endpoint from a dual-ID identity. AniList
 * remains preferred; a MAL ID is used only with MegaPlay's /mal endpoint.
 */
export function buildMegaPlayStreamUrl({ anilistId = null, malId = null } = {}, episode, language = STREAM_LANGUAGES.SUB) {
  return buildAniListStreamUrl(anilistId, episode, language)
    || buildMalStreamUrl(malId, episode, language);
}

/** Return the other ID-based endpoint when the preferred mapping fails. */
export function buildAlternateMegaPlayStreamUrl({ anilistId = null, malId = null } = {}, episode, language = STREAM_LANGUAGES.SUB) {
  const primary = buildMegaPlayStreamUrl({ anilistId, malId }, episode, language);
  const alternatives = [
    buildAniListStreamUrl(anilistId, episode, language),
    buildMalStreamUrl(malId, episode, language),
  ];
  return alternatives.find((url) => url && url !== primary) || null;
}

/** Build ordered recovery URLs without repeating the currently selected URL. */
export function buildMegaPlayFallbackUrls(identity, episode, language = STREAM_LANGUAGES.SUB) {
  const normalizedIdentity = typeof identity === 'object' && identity !== null
    ? identity
    : { anilistId: identity };
  const primary = buildMegaPlayStreamUrl(normalizedIdentity, episode, language);
  const fallbackLanguage = getFallbackLanguage(language);
  const candidates = [
    buildAlternateMegaPlayStreamUrl(normalizedIdentity, episode, language),
    fallbackLanguage ? buildMegaPlayStreamUrl(normalizedIdentity, episode, fallbackLanguage) : null,
    fallbackLanguage
      ? buildAlternateMegaPlayStreamUrl(normalizedIdentity, episode, fallbackLanguage)
      : null,
  ];

  return [...new Set(candidates.filter((url) => url && url !== primary))];
}

/**
 * Legacy AniList-only API retained for existing callers. New dual-ID callers
 * should use buildMegaPlayStreamUrl().
 */
export function buildStreamUrl(anilistId, episode, language = STREAM_LANGUAGES.SUB) {
  return buildAniListStreamUrl(anilistId, episode, language);
}

/**
 * If dub fails, the only sensible fallback is sub. If sub fails, there's
 * nothing left to fall back to (caller should show "No streaming source
 * available.").
 */
export function getFallbackLanguage(currentLanguage) {
  return currentLanguage === STREAM_LANGUAGES.DUB ? STREAM_LANGUAGES.SUB : null;
}

/**
 * Convenience helper for the player: returns both the URL to try now and
 * the URL to fall back to (if any), so the UI layer doesn't need to
 * reimplement the dub->sub rule itself.
 */
export function buildStreamUrlWithFallback(identityOrAniListId, episode, language) {
  const identity = typeof identityOrAniListId === 'object' && identityOrAniListId !== null
    ? identityOrAniListId
    : { anilistId: identityOrAniListId };
  const primary = buildMegaPlayStreamUrl(identity, episode, language);
  const fallbackLang = getFallbackLanguage(language);
  const fallback = fallbackLang ? buildMegaPlayStreamUrl(identity, episode, fallbackLang) : null;

  return { primary, fallbackLang, fallback };
}
