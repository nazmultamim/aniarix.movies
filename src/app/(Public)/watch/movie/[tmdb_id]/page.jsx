import PlaybackExperience from '@/components/player/PlaybackExperience';
import { getMovieDetails, getTmdbErrorMessage } from '@/services/tmdb.service';
import { getPlaybackProviders } from '@/services/player-providers.service';
import { getWatchProgress } from '@/lib/action/Getwatchhistory';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tmdb_id: id } = await params;
  return { title: `Watch Movie ${id} | AniArix Movie`, description: 'Movie playback page on AniArix Movie.' };
}

export default async function MoviePlaybackRoute({ params }) {
  const { tmdb_id: id } = await params;
  let details = null;
  let loadError = '';
  try { details = await getMovieDetails(id); } catch (error) { loadError = getTmdbErrorMessage(error); }
  const parsedId = Number(id);
  const providers = details && Number.isSafeInteger(parsedId)
    ? await getPlaybackProviders({ mediaType: 'movie', tmdbId: parsedId })
    : [];
  const { entry: progress } = details ? await getWatchProgress({ mediaType: 'movie', tmdbId: parsedId }) : { entry: null };
  return details
    ? <PlaybackExperience mediaType="movie" tmdbId={parsedId} title={details.title} posterPath={details.poster_path} providers={providers} resumePosition={progress?.completed ? 0 : progress?.current_time_seconds || 0} />
    : <main className="min-h-[70vh] bg-[#09090b] px-5 py-24 text-center text-white"><h1 className="text-2xl font-bold">Movie unavailable</h1><p role="alert" className="mt-3 text-sm text-white/55">{loadError || 'The movie details could not be loaded.'}</p></main>;
}
