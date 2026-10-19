import MediaBrowsePage, { MediaShelf } from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { getTopRated, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'Top Rated', description: 'Discover highly rated movies and TV shows.', alternates: { canonical: getCanonicalUrl('/top-rated') } };
export const dynamic = 'force-dynamic';
export default async function TopRatedPage() {
  let movies = [];
  let tv = [];
  let errorMessage = '';
  try {
    const [moviesResult, tvResult] = await Promise.all([getTopRated('movie'), getTopRated('tv')]);
    movies = moviesResult.results;
    tv = tvResult.results;
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  if (errorMessage) return <MediaBrowsePage title="Top Rated" description="Find movies and series with standout audience ratings." error={errorMessage} />;
  return <main className="min-h-[70vh] bg-[#09090b] pb-12 text-white"><header className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p><h1 className="mt-2 text-3xl font-black">Top Rated</h1><p className="mt-2 text-sm text-white/55">Movies and series with standout audience ratings.</p></header><MediaShelf title="Top Rated Movies" href="/movies" mediaType="movie" items={movies} /><MediaShelf title="Top Rated TV Shows" href="/tv" mediaType="tv" items={tv} /></main>;
}
