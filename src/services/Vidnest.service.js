const VIDNEST_BASE_URL = 'https://vidnest.fun';

export const VIDNEST_SERVERS = {
  ANIME: 'anime',
  ANIMEPAHE: 'animepahe',
};

/**
 * Build a Vidnest iframe URL.
 * @param {string} serverType - 'anime' or 'animepahe'
 * @param {string|number} anilistId
 * @param {string|number} episode
 * @param {string} language - 'sub' or 'dub' (or other language strings like 'hindi')
 */
export function buildVidnestUrl(serverType, anilistId, episode, language = 'sub') {
  if (!anilistId || !episode) return null;
  const validServer = Object.values(VIDNEST_SERVERS).includes(serverType)
    ? serverType
    : VIDNEST_SERVERS.ANIME;
  const lang = language || 'sub';
  return `${VIDNEST_BASE_URL}/${validServer}/${anilistId}/${episode}/${lang}`;
}
