import Link from 'next/link';
import { ArrowRight, Clapperboard, Search, Sparkles, Tv } from 'lucide-react';
import MediaBrowsePage, { MediaShelf } from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl, siteConfig } from '@/lib/site-config';
import { getPopular, getTmdbErrorMessage, getTrending } from '@/services/tmdb.service';

export const metadata = {
  title: 'Discover Movies & TV Shows',
  description: siteConfig.description,
  alternates: { canonical: getCanonicalUrl('/home') },
};
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [trending, movies, tv] = await Promise.all([
    getTrending('all').then((data) => ({ data })).catch((error) => ({ error: getTmdbErrorMessage(error) })),
    getPopular('movie').then((data) => ({ data })).catch((error) => ({ error: getTmdbErrorMessage(error) })),
    getPopular('tv').then((data) => ({ data })).catch((error) => ({ error: getTmdbErrorMessage(error) })),
  ]);
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,0.22),transparent_58%),linear-gradient(180deg,#111116_0%,#09090b_100%)]" />
        <div className="mx-auto flex min-h-[460px] w-full max-w-[1600px] flex-col items-start justify-center px-5 py-16 sm:px-8 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.08] px-3 py-1.5 text-xs font-semibold text-orange-200"><Sparkles className="h-3.5 w-3.5" /> AniArix Movie</span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">Stories for every <span className="bg-gradient-to-r from-orange-300 to-red-400 bg-clip-text text-transparent">screen.</span></h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">Explore movies and TV shows, keep your watchlist close, and pick up where you left off.</p>
          <Link href="/search" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:brightness-110"><Search className="h-4 w-4" /> Search titles <ArrowRight className="h-4 w-4" /></Link>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/movies" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold hover:border-orange-400/40"><Clapperboard className="h-4 w-4 text-orange-300" /> Movies</Link>
            <Link href="/tv" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold hover:border-orange-400/40"><Tv className="h-4 w-4 text-orange-300" /> TV Shows</Link>
          </div>
        </div>
      </section>
      <MediaShelf title="Trending" href="/trending" items={trending.data?.results} error={trending.error} />
      <MediaShelf title="Popular Movies" href="/popular?type=movie" mediaType="movie" items={movies.data?.results} error={movies.error} />
      <MediaShelf title="Popular TV Shows" href="/popular?type=tv" mediaType="tv" items={tv.data?.results} error={tv.error} />
      <MediaBrowsePage title="Discover more" description="Browse curated collections and explore by format." />
    </main>
  );
}
