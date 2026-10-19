import Link from 'next/link';
import {
  Star, Play, Tv, Calendar, Clock, Hash, Layers, Sparkles, ShieldAlert, Radio,
} from 'lucide-react';
import { slugify } from '@/lib/slugify';

// ── Vertical detail row (label left, value right) ──────────────────
function DetailRow({ icon: Icon, label, children, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-6 border-b border-white/[0.06] last:border-0">
      <div className="flex items-center gap-2.5 text-muted-foreground/50">
        <Icon className={`w-4 h-4 ${highlight ? 'text-orange-400' : ''}`} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-sm font-semibold text-right ${highlight ? 'text-orange-300' : 'text-white'}`}>
        {children}
      </div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h3 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-3 mb-5">
      <span className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-red-600 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
      {children}
    </h3>
  );
}

function formatAiredDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return null;
  }
}

function toDisplayLabel(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.name || value.title || value.label || '';
  return '';
}

// ── Main component ─────────────────────────────────────────────────
export default function AnimeDetail({ anime }) {
  const titleEnglish = anime.title_english || anime.title || '—';
  const titleJapanese = anime.title_japanese || '—';
  const posterUrl = anime.poster_image || 'https://placehold.co/400x600/1a1a1a/444444?text=No+Image';
  const airedFromLabel = formatAiredDate(anime.aired_from);
  const slug = anime.slug || slugify(titleEnglish);

  // Everything the /watch page needs travels via URL — no extra fetch there.
  const anilistId = anime.anilist_id ?? null;
  const watchHref = anilistId
    ? `/watch/${slug}/ep-1`
    : null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-red-900/15 blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-orange-900/10 blur-[120px]" />
      </div>

      {/* Cinematic backdrop behind hero */}
      <div className="absolute top-16 left-0 right-0 h-[520px] overflow-hidden pointer-events-none">
        <img
          src={posterUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-top blur-3xl scale-110 opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
      </div>

      <div className="relative container mx-auto px-4 py-6 md:py-10 pb-20">
        {/* HERO */}
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white leading-tight tracking-tight">
              {titleEnglish}
            </h1>
            <p className="mt-2 text-sm md:text-base font-medium text-muted-foreground/55">
              {titleJapanese}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] gap-8 items-start">

            {/* Poster */}
            <div className="relative mx-auto md:mx-0 w-64 sm:w-72 md:w-full">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/40 to-red-600/40 blur-2xl scale-105 -z-10" />
              <div className="w-full rounded-2xl overflow-hidden border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                <img
                  src={posterUrl}
                  alt={titleEnglish}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              {anime.score != null && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#141010] px-4 py-2 rounded-full border border-orange-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                  <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                  <span className="text-orange-300 font-black text-base">{anime.score}</span>
                  <span className="text-muted-foreground/40 text-sm font-medium">/ 10</span>
                </div>
              )}
            </div>

            {/* Right column: vertical detail card */}
            <div className="flex flex-col gap-6 mt-6 md:mt-0">
              {watchHref && (
                <Link
                  href={watchHref}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold hover:shadow-[0_0_24px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 transition-all"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Watch Now
                </Link>
              )}

              <div className="w-full rounded-2xl bg-card/70 backdrop-blur-sm border border-white/[0.08] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)] text-left">
                {anime.type && (
                  <DetailRow icon={Tv} label="Type">{anime.type}</DetailRow>
                )}
                {anime.source && (
                  <DetailRow icon={Layers} label="Source">{anime.source}</DetailRow>
                )}
                {anime.episodes != null && (
                  <DetailRow icon={Hash} label="Episodes">{anime.episodes}</DetailRow>
                )}
                {anime.status && (
                  <DetailRow icon={Radio} label="Status" highlight={anime.airing}>
                    <span className="flex items-center gap-1.5 justify-end">
                      {anime.airing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {anime.status}
                    </span>
                  </DetailRow>
                )}
                {airedFromLabel && (
                  <DetailRow icon={Calendar} label="Aired">{airedFromLabel}</DetailRow>
                )}
                {anime.duration && (
                  <DetailRow icon={Clock} label="Duration">{anime.duration}</DetailRow>
                )}
                {anime.rating && (
                  <DetailRow icon={ShieldAlert} label="Rating">{anime.rating}</DetailRow>
                )}
                {anime.rank != null && (
                  <DetailRow icon={Sparkles} label="Rank">#{anime.rank}</DetailRow>
                )}
                {anime.year && (
                  <DetailRow icon={Calendar} label="Year">{anime.year}</DetailRow>
                )}

                {anime.genres?.length > 0 && (
                  <div className="flex items-start justify-between gap-4 py-4 px-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 pt-0.5 shrink-0">Genres</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {anime.genres.map((g) => {
                        const label = toDisplayLabel(g);
                        return (
                          <span
                            key={label || JSON.stringify(g)}
                            className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-xs text-gray-300 font-medium hover:border-orange-500/40 hover:text-orange-200 transition-colors cursor-pointer"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <div className="mt-16 max-w-5xl mx-auto">
          <SectionHeading>Synopsis</SectionHeading>
          <p className="text-gray-300/90 leading-relaxed text-sm md:text-base">
            {anime.synopsis || 'No synopsis available.'}
          </p>
        </div>

        {/* Trailer */}
        {anime.trailer_embed_url && (
          <div className="mt-10 max-w-5xl mx-auto">
            <SectionHeading>Trailer</SectionHeading>
            <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.5)] bg-black aspect-video">
              <iframe
                src={anime.trailer_embed_url}
                title={`${titleEnglish} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
