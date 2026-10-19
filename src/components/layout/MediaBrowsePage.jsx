import Link from 'next/link';
import { ArrowRight, Clapperboard, Compass, Film, Search, Tv } from 'lucide-react';
import MediaCard from './MediaCard';

const COLLECTIONS = [
  { title: 'Popular', href: '/popular', description: 'Find titles audiences are watching.', icon: Compass },
  { title: 'Top Rated', href: '/top-rated', description: 'Explore highly rated movies and series.', icon: Film },
  { title: 'Upcoming', href: '/upcoming', description: 'See what is coming soon.', icon: ArrowRight },
  { title: 'Genres', href: '/genres', description: 'Browse stories by genre.', icon: Clapperboard },
];

export function MediaShelf({ title, href, items = [], mediaType, error }) {
  const filtered = mediaType ? items.filter((item) => item.media_type === mediaType || item.type === mediaType) : items;
  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        {href && <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-300 hover:text-orange-200">View all <ArrowRight className="h-4 w-4" /></Link>}
      </div>
      {error ? (
        <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-5 py-7 text-sm text-red-200">{error}</div>
      ) : filtered.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {filtered.map((item) => <MediaCard key={`${item.media_type || item.type || 'movie'}-${item.tmdb_id || item.id}`} media={item} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-9 text-center">
          <Film className="mx-auto h-7 w-7 text-white/25" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-white/75">No titles found</p>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-white/45">There are no titles to show for this collection right now.</p>
        </div>
      )}
    </section>
  );
}

export default function MediaBrowsePage({ title, description, mediaType, items = [], error, genres = [], activeGenre, activeType }) {
  return (
    <main className="min-h-[70vh] bg-[#09090b] pb-12 text-white">
      <header className="mx-auto w-full max-w-[1600px] px-4 pb-7 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">{description}</p>
          </div>
          <Link href="/search" aria-label="Search movies and TV shows" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75 hover:border-orange-500/40 hover:text-white"><Search className="h-5 w-5" /></Link>
        </div>
      </header>
      {genres.length > 0 && <section className="mx-auto mb-2 w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2" aria-label="Genres">
          {genres.map((genre) => <Link key={`${genre.mediaType}-${genre.id}`} href={`/genres?type=${genre.mediaType}&genre=${genre.id}`} aria-current={String(activeGenre) === String(genre.id) && activeType === genre.mediaType ? 'page' : undefined} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${String(activeGenre) === String(genre.id) && activeType === genre.mediaType ? 'border-orange-400/50 bg-orange-400/10 text-orange-200' : 'border-white/10 text-white/55 hover:border-white/20 hover:text-white'}`}>{genre.name} <span className="ml-1 text-white/35">{genre.mediaType === 'tv' ? 'TV' : 'Movie'}</span></Link>)}
        </div>
      </section>}
      <MediaShelf title={title} items={items} mediaType={mediaType} error={error} />
      {!mediaType && (
        <section className="mx-auto grid w-full max-w-[1600px] gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {COLLECTIONS.map(({ title: label, href, description: text, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-orange-500/30 hover:bg-white/[0.04]">
              <Icon className="h-5 w-5 text-orange-400" />
              <h2 className="mt-4 font-bold text-white">{label}</h2>
              <p className="mt-1 text-sm text-white/50">{text}</p>
            </Link>
          ))}
          <Link href="/movies" className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-orange-500/30 sm:col-span-1 lg:col-span-2">
            <Clapperboard className="h-6 w-6 text-orange-400" /><span><strong className="block">Movies</strong><span className="text-sm text-white/50">Browse feature films</span></span><ArrowRight className="ml-auto h-4 w-4 text-white/40" />
          </Link>
          <Link href="/tv" className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-orange-500/30 sm:col-span-1 lg:col-span-2">
            <Tv className="h-6 w-6 text-orange-400" /><span><strong className="block">TV Shows</strong><span className="text-sm text-white/50">Browse series and episodes</span></span><ArrowRight className="ml-auto h-4 w-4 text-white/40" />
          </Link>
        </section>
      )}
    </main>
  );
}
