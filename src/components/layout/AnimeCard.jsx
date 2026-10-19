'use client';

import Link from 'next/link';
import { Star, Tv } from 'lucide-react';
import { slugify } from '@/lib/slugify';
import { formatAnimeScore } from '@/lib/anime-score';
import { getAnimeDisplayTitle, getAnimeExternalIds } from '@/lib/anime-display';

function toDisplayLabel(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.name || value.title || value.label || '';
  return '';
}

export default function AnimeCard({ anime }) {
  const imageSrc = typeof (anime?.poster_image || anime?.poster) === 'string' && (anime?.poster_image || anime?.poster).trim()
    ? (anime.poster_image || anime.poster)
    : 'https://placehold.co/400x600/111111/f97316?text=No+Image';

  const title = getAnimeDisplayTitle(anime, 'Untitled anime');
  const slug = anime?.slug || slugify(title);

  const { anilistId, malId } = getAnimeExternalIds(anime);
  const watchRoute = anilistId ? slug : malId ? `mal-${malId}` : null;
  const watchHref = watchRoute
    ? `/watch/${watchRoute}/ep-1`
    : '/anime';

  return (
    <Link
      href={watchHref}
      className="group relative block overflow-hidden rounded-xl bg-card border border-border aspect-[2/3] transition-all duration-300 hover:border-orange-500/50 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]"
    >
      <img
        src={imageSrc}
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.src =
            'https://placehold.co/400x600/1a1a1a/444444?text=No+Image';
        }}
      />

      {/* Type Badge (TV / Movie / OVA / Special / ONA) */}
      {anime.type && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-black/80 backdrop-blur-md px-2 py-1 shadow-sm">
          <Tv className="h-3 w-3 text-orange-500" />
          <span className="text-[10px] sm:text-xs font-bold text-white">
            {anime.type}
          </span>
        </div>
      )}

      {/* Score Badge */}
      {anime.score != null && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-black/80 backdrop-blur-md px-2 py-1 shadow-sm">
          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-orange-500 text-orange-500" />
          <span className="text-[10px] sm:text-xs font-bold text-white">
            {formatAnimeScore(anime.score) ?? '—'}
          </span>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4">
        <h3 className="mb-1 md:mb-2 line-clamp-2 text-sm sm:text-base md:text-lg font-bold leading-tight text-white transition-colors group-hover:text-orange-400">
          {title}
        </h3>

        {/* Genres - Desktop only */}
        <div className="hidden md:flex flex-wrap gap-1.5 mb-2">
          {anime.genres?.slice(0, 2).map((g) => {
            const label = toDisplayLabel(g);
            return (
              <span
                key={label || JSON.stringify(g)}
                className="rounded bg-white/10 border border-white/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-300"
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* Synopsis - Desktop hover */}
        {anime.synopsis && (
          <p className="hidden md:block overflow-hidden max-h-0 opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100 text-xs text-gray-400 line-clamp-3">
            {anime.synopsis}
          </p>
        )}
      </div>
    </Link>
  );
}
