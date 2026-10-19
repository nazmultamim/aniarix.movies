import MediaDetailPage from '@/components/layout/MediaDetailPage';
import { getSeasonDetails, getTmdbErrorMessage, getTvDetails } from '@/services/tmdb.service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tmdb_id: id } = await params;
  try {
    const show = await getTvDetails(id);
    return { title: `${show.title} | AniArix Movie`, description: show.overview || `TV show details for ${show.title}.` };
  } catch {
    return { title: 'TV Shows | AniArix Movie', description: 'TV show details on AniArix Movie.' };
  }
}

export default async function TvDetailRoute({ params, searchParams }) {
  const { tmdb_id: id } = await params;
  const query = await searchParams;
  let details = null;
  let season = null;
  let seasonError = '';
  let errorMessage = '';
  try {
    details = await getTvDetails(id);
    const requestedSeason = /^\d+$/.test(String(query?.season ?? '')) ? Number(query.season) : null;
    const seasonNumber = requestedSeason ?? details.seasons.find((season) => season.season_number > 0)?.season_number ?? details.seasons[0]?.season_number;
    if (seasonNumber != null) {
      try { season = await getSeasonDetails(id, seasonNumber); }
      catch (error) { seasonError = getTmdbErrorMessage(error); }
    }
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <MediaDetailPage type="tv" id={id} details={details} season={season} seasonError={seasonError} tmdbError={errorMessage} />;
}
