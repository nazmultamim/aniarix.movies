import { buildStreamUrlWithFallback } from './Megaplay.service';
import { buildVidnestUrl, VIDNEST_SERVERS } from './Vidnest.service';

export const SERVERS = [
  {
    id: 'megaplay',
    label: 'Server 1',
    name: 'MegaPlay',
    type: 'megaplay',
    supportedIds: ['anilist', 'mal'],
  },
  {
    id: 'vidnest-anime',
    label: 'Server 2',
    name: 'Vidnest Anime',
    type: 'vidnest',
    supportedIds: ['anilist'],
    vidnestServer: VIDNEST_SERVERS.ANIME,
  },
  {
    id: 'vidnest-animepahe',
    label: 'Server 3',
    name: 'Vidnest AnimePahe',
    type: 'vidnest',
    supportedIds: ['anilist'],
    vidnestServer: VIDNEST_SERVERS.ANIMEPAHE,
  },
];

export const DEFAULT_SERVER = 'megaplay';

/**
 * Build the embed URL for any server.
 * @param {string} serverId - one of SERVERS[].id
 * @param {{ anilistId?: string|number, malId?: string|number }|string|number} identity
 * @param {string|number} episode
 * @param {string} language - 'sub' or 'dub'
 */
export function buildEmbedUrl(serverId, identityOrAniListId, episode, language = 'sub') {
  const server = SERVERS.find((s) => s.id === serverId);
  if (!server) return null;
  // Numeric/string inputs remain an AniList ID for WatchPlayer compatibility.
  const identity = typeof identityOrAniListId === 'object' && identityOrAniListId !== null
    ? identityOrAniListId
    : { anilistId: identityOrAniListId };

  if (server.type === 'megaplay') {
    const { primary } = buildStreamUrlWithFallback(identity, episode, language);
    return primary;
  }

  if (server.type === 'vidnest') {
    // Vidnest does not support MAL IDs. Its builder only receives a verified
    // AniList ID, so a MAL-only identity is explicitly unavailable.
    return buildVidnestUrl(server.vidnestServer, identity.anilistId, episode, language);
  }

  return null;
}
