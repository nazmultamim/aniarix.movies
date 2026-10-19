import { getAnime } from '@/services/anime/anime.service';

export async function getAnimeOgPayload(identityOrAniListId) {
  const identity = typeof identityOrAniListId === 'object' && identityOrAniListId !== null
    ? identityOrAniListId
    : { anilistId: identityOrAniListId };
  if (!identity.anilistId && !identity.malId) {
    return {
      title: 'AniArix',
      japaneseTitle: null,
      bannerUrl: null,
    };
  }

  try {
    const anime = await getAnime(identity);
    const fallbackId = anime?.anilistId || anime?.malId || identity.anilistId || identity.malId;
    const title = String(anime?.title?.english || anime?.title?.romaji || anime?.title?.native || `AniArix #${fallbackId}`).trim();
    const japaneseTitle = String(anime?.title?.native || '').trim();

    return {
      title,
      japaneseTitle: japaneseTitle || null,
      bannerUrl: anime?.banner || anime?.poster || null,
    };
  } catch {
    return {
      title: `AniArix #${identity.anilistId || identity.malId}`,
      japaneseTitle: null,
      bannerUrl: null,
    };
  }
}
