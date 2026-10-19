import Link from 'next/link';
import PlaybackExperience from '@/components/player/PlaybackExperience';
import { getSeasonDetails, getTmdbErrorMessage, getTvDetails } from '@/services/tmdb.service';
import { getPlaybackProviders } from '@/services/player-providers.service';
import { getWatchProgress } from '@/lib/action/Getwatchhistory';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tmdb_id: id, season_number: season, episode_number: episode } = await params;
  return { title: `Watch ${id} · S${season} E${episode} | AniArix Movie`, description: 'TV episode playback page on AniArix Movie.' };
}

export default async function TvEpisodePlaybackRoute({ params }) {
  const { tmdb_id: id, season_number: seasonParam, episode_number: episodeParam } = await params;
  const tmdbId = Number(id);
  const seasonNumber = Number(seasonParam);
  const episodeNumber = Number(episodeParam);
  if (![tmdbId, seasonNumber, episodeNumber].every(Number.isSafeInteger) || tmdbId <= 0 || seasonNumber < 0 || episodeNumber <= 0) {
    return <main className="min-h-[70vh] bg-[#09090b] px-5 py-24 text-center text-white"><h1 className="text-2xl font-bold">Episode unavailable</h1><p role="alert" className="mt-3 text-sm text-white/55">The requested TV episode number is invalid.</p></main>;
  }

  let details;
  let season;
  try {
    [details, season] = await Promise.all([getTvDetails(tmdbId), getSeasonDetails(tmdbId, seasonNumber)]);
  } catch (error) {
    return <main className="min-h-[70vh] bg-[#09090b] px-5 py-24 text-center text-white"><h1 className="text-2xl font-bold">Episode unavailable</h1><p role="alert" className="mt-3 text-sm text-white/55">{getTmdbErrorMessage(error)}</p></main>;
  }

  const episode = season.episodes?.find((item) => item.episode_number === episodeNumber);
  if (!episode) return <main className="min-h-[70vh] bg-[#09090b] px-5 py-24 text-center text-white"><h1 className="text-2xl font-bold">Episode unavailable</h1><p role="alert" className="mt-3 text-sm text-white/55">TMDB has no metadata for this episode.</p><Link href={`/tv/${tmdbId}`} className="mt-5 inline-block text-orange-200">Return to series</Link></main>;

  const providers = await getPlaybackProviders({ mediaType: 'tv', tmdbId, seasonNumber, episodeNumber });
  const { entry: progress } = await getWatchProgress({ mediaType: 'tv', tmdbId, seasonNumber, episodeNumber });
  const episodeIndex = season.episodes.findIndex((item) => item.episode_number === episodeNumber);
  return <PlaybackExperience mediaType="tv" tmdbId={tmdbId} title={details.title} posterPath={details.poster_path} seasonNumber={seasonNumber} episodeNumber={episodeNumber} episodeTitle={episode.name} providers={providers} resumePosition={progress?.completed ? 0 : progress?.current_time_seconds || 0} previousEpisode={season.episodes[episodeIndex - 1]?.episode_number ?? null} nextEpisode={season.episodes[episodeIndex + 1]?.episode_number ?? null} />;
}
