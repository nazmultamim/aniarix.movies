import MediaBrowsePage from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { getPopular, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'Movies', description: 'Browse movies on AniArix Movie.', alternates: { canonical: getCanonicalUrl('/movies') } };
export const dynamic = 'force-dynamic';
export default async function MoviesPage() {
  let items = [];
  let errorMessage = '';
  try {
    const result = await getPopular('movie');
    items = result.results;
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <MediaBrowsePage title="Movies" description="Explore feature films across genres, eras, and moods." mediaType="movie" items={items} error={errorMessage} />;
}
