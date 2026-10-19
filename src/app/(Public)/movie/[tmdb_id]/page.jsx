import MediaDetailPage from '@/components/layout/MediaDetailPage';
import { getMovieDetails, getTmdbErrorMessage } from '@/services/tmdb.service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tmdb_id: id } = await params;
  try {
    const movie = await getMovieDetails(id);
    return { title: `${movie.title} | AniArix Movie`, description: movie.overview || `Movie details for ${movie.title}.` };
  } catch {
    return { title: 'Movie | AniArix Movie', description: 'Movie details on AniArix Movie.' };
  }
}

export default async function MovieDetailRoute({ params }) {
  const { tmdb_id: id } = await params;
  let movie = null;
  let errorMessage = '';
  try {
    movie = await getMovieDetails(id);
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <MediaDetailPage type="movie" id={id} details={movie} tmdbError={errorMessage} />;
}
