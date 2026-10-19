import MediaBrowsePage, { MediaShelf } from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { getOnTheAirTv, getUpcomingMovies, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'Upcoming', description: 'See upcoming movies and TV shows on AniArix Movie.', alternates: { canonical: getCanonicalUrl('/upcoming') } };
export const dynamic = 'force-dynamic';
export default async function UpcomingPage() {
  let movies = [];
  let tv = [];
  let errorMessage = '';
  try {
    const [moviesResult, tvResult] = await Promise.all([getUpcomingMovies(), getOnTheAirTv()]);
    movies = moviesResult.results;
    tv = tvResult.results;
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  if (errorMessage) return <MediaBrowsePage title="Upcoming" description="Upcoming movies and shows currently on the air." error={errorMessage} />;
  return <main className="min-h-[70vh] bg-[#09090b] pb-12 text-white"><header className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p><h1 className="mt-2 text-3xl font-black">Upcoming & On the Air</h1><p className="mt-2 text-sm text-white/55">Upcoming movies and TV shows currently airing new episodes.</p></header><MediaShelf title="Upcoming Movies" href="/movies" mediaType="movie" items={movies} /><MediaShelf title="On the Air" href="/tv" mediaType="tv" items={tv} /></main>;
}
