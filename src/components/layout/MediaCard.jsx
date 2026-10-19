import Link from 'next/link';
import { CalendarDays, Clapperboard, Star, Tv } from 'lucide-react';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

export default function MediaCard({ media }) {
  const type = media?.media_type === 'tv' || media?.type === 'tv' ? 'tv' : 'movie';
  const title = media?.title || media?.name || 'Untitled';
  const id = media?.tmdb_id ?? media?.id;
  const href = id ? `/${type === 'tv' ? 'tv' : 'movie'}/${id}` : '/movies';
  const poster = media?.poster_path || media?.poster || null;
  const posterUrl = poster?.startsWith('http') ? poster : poster ? `https://image.tmdb.org/t/p/w500${poster}` : null;
  const year = formatDate(media?.release_date || media?.first_air_date);
  const rating = Number(media?.vote_average ?? media?.rating);
  const TypeIcon = type === 'tv' ? Tv : Clapperboard;

  return (
    <Link href={href} className="group block min-w-0" aria-label={`${title}, ${type === 'tv' ? 'TV show' : 'movie'}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition duration-300 group-hover:-translate-y-1 group-hover:border-orange-500/40 group-hover:shadow-[0_16px_36px_-20px_rgba(249,115,22,0.5)]">
        {posterUrl ? (
          <img src={posterUrl} alt={`${title} poster`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 via-zinc-950 to-orange-950/30 text-white/30">
            <TypeIcon className="h-8 w-8" aria-hidden="true" />
            <span className="px-3 text-center text-xs">Poster unavailable</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          <TypeIcon className="h-3 w-3 text-orange-400" aria-hidden="true" />
          {type === 'tv' ? 'TV Show' : 'Movie'}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-orange-300 sm:text-base">{title}</h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/65">
            {year && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{year}</span>}
            {Number.isFinite(rating) && rating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{rating.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
