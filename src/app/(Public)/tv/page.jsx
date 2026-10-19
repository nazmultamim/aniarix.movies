import MediaBrowsePage from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { getPopular, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'TV Shows', description: 'Browse TV shows on AniArix Movie.', alternates: { canonical: getCanonicalUrl('/tv') } };
export const dynamic = 'force-dynamic';
export default async function TvPage() {
  let items = [];
  let errorMessage = '';
  try {
    const result = await getPopular('tv');
    items = result.results;
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <MediaBrowsePage title="TV Shows" description="Explore series, seasons, and stories made to keep watching." mediaType="tv" items={items} error={errorMessage} />;
}
