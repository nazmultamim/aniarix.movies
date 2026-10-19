import MediaBrowsePage, { MediaShelf } from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { getPopular, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'Popular', description: 'Browse popular movies and TV shows on AniArix Movie.', alternates: { canonical: getCanonicalUrl('/popular') } };
export const dynamic = 'force-dynamic';
export default async function PopularPage({ searchParams }) {
  const params = await searchParams;
  const type = params?.type === 'tv' ? 'tv' : params?.type === 'movie' ? 'movie' : null;
  let movies = null;
  let tv = null;
  let selected = null;
  let errorMessage = '';
  try {
    if (type) selected = await getPopular(type);
    else [movies, tv] = await Promise.all([getPopular('movie'), getPopular('tv')]);
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  if (errorMessage) return <MediaBrowsePage title="Popular" description="Explore movies and TV shows audiences are watching." error={errorMessage} />;
  if (type) return <MediaBrowsePage title={`Popular ${type === 'tv' ? 'TV Shows' : 'Movies'}`} description="Explore titles audiences are watching." mediaType={type} items={selected?.results || []} />;
  return <main className="min-h-[70vh] bg-[#09090b] pb-12 text-white"><header className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p><h1 className="mt-2 text-3xl font-black">Popular</h1><p className="mt-2 text-sm text-white/55">Explore movies and TV shows audiences are watching.</p></header><MediaShelf title="Popular Movies" href="/movies" mediaType="movie" items={movies.results} /><MediaShelf title="Popular TV Shows" href="/tv" mediaType="tv" items={tv.results} /></main>;
}
