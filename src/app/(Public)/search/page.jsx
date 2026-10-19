import MediaSearchPage from '@/components/layout/MediaSearchPage';
import { getTmdbErrorMessage, searchMoviesAndTv } from '@/services/tmdb.service';

export const metadata = { title: 'Search', description: 'Search movies and TV shows on AniArix Movie.' };
export const dynamic = 'force-dynamic';
export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = typeof params?.q === 'string' ? params.q : '';
  let items = [];
  let errorMessage = '';
  try {
    if (query.trim()) {
      const result = await searchMoviesAndTv(query);
      items = result.results;
    }
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <MediaSearchPage initialQuery={query} items={items} error={errorMessage} />;
}
