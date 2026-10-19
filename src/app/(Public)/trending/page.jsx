import MediaBrowsePage, { MediaShelf } from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { getTrending, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'Trending', description: 'Discover trending movies and TV shows on AniArix Movie.', alternates: { canonical: getCanonicalUrl('/trending') } };
export const dynamic = 'force-dynamic';
export default async function TrendingPage() {
  let movies = [];
  let tv = [];
  let errorMessage = '';
  try {
    const [moviesResult, tvResult] = await Promise.all([getTrending('movie'), getTrending('tv')]);
    movies = moviesResult.results;
    tv = tvResult.results;
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <main className="min-h-[70vh] bg-[#09090b] pb-12 text-white"><header className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p><h1 className="mt-2 text-3xl font-black">Trending</h1><p className="mt-2 text-sm text-white/55">The latest conversation starters across movies and TV.</p></header>{errorMessage ? <MediaBrowsePage title="Trending" description="The latest conversation starters across movies and TV." error={errorMessage} /> : <><MediaShelf title="Trending Movies" href="/movies" mediaType="movie" items={movies} /><MediaShelf title="Trending TV Shows" href="/tv" mediaType="tv" items={tv} /></>}</main>;
}
