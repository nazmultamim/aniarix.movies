import Link from 'next/link';
import { Film, Search } from 'lucide-react';
import MediaCard from './MediaCard';

export default function MediaSearchPage({ initialQuery = '', items = [], error = '' }) {
  return (
    <main className="min-h-[70vh] bg-[#09090b] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Search</h1>
        <p className="mt-2 text-sm text-white/55">Find movies and TV shows by title.</p>
        <form action="/search" method="get" className="mt-7 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-orange-400/50">
          <Search className="ml-3 mt-3 h-5 w-5 shrink-0 text-white/40" aria-hidden="true" />
          <input defaultValue={initialQuery} name="q" type="search" maxLength={200} placeholder="Search movies and TV shows" aria-label="Search movies and TV shows" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-white/35" />
          <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400">Search</button>
        </form>
        {error ? <p role="alert" className="mt-8 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 text-sm text-red-200">{error}</p> : initialQuery.trim() ? (
          items.length ? <section className="mt-8"><h2 className="mb-4 text-lg font-bold">Results for “{initialQuery.trim()}”</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">{items.map((item) => <MediaCard key={`${item.media_type}-${item.id}`} media={item} />)}</div></section> : <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><Film className="mx-auto h-8 w-8 text-white/25" /><p className="mt-3 text-sm font-semibold text-white/75">No matching titles</p><p className="mx-auto mt-1 max-w-lg text-xs text-white/45">Try another title or spelling.</p></div>
        ) : <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><Film className="mx-auto h-8 w-8 text-white/25" /><p className="mt-3 text-sm font-semibold text-white/75">Search movies and TV shows</p><p className="mx-auto mt-1 max-w-lg text-xs text-white/45">Enter a title above to search the TMDB catalog.</p><Link href="/movies" className="mt-4 inline-flex text-xs font-semibold text-orange-300 hover:text-orange-200">Browse movies</Link></div>}
      </div>
    </main>
  );
}
