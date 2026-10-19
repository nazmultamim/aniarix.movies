import Link from 'next/link';
import { MdLiveTv } from 'react-icons/md';

const RELATION_LABELS = {
  SEQUEL: 'Sequel',
  PREQUEL: 'Prequel',
  SIDE_STORY: 'Side Story',
  SPIN_OFF: 'Spin-Off',
  ALTERNATIVE: 'Alternative',
  PARENT: 'Parent Story',
  SUMMARY: 'Summary',
  FULL_STORY: 'Full Story',
};

// Sequel/Prequel first — the most relevant cases (e.g. "Season 2") — then
// the rest in a sensible order. Anything not in this list (ADAPTATION,
// CHARACTER, OTHER, SOURCE, COMPILATION) is already filtered out upstream
// in normalizeRelations() since those aren't meaningful "related anime."
const RELATION_ORDER = ['SEQUEL', 'PREQUEL', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'PARENT', 'SUMMARY', 'FULL_STORY'];

const RELATION_STYLE = {
  SEQUEL: 'bg-orange-500/90 text-white',
  PREQUEL: 'bg-sky-500/90 text-white',
  SIDE_STORY: 'bg-purple-500/90 text-white',
  SPIN_OFF: 'bg-pink-500/90 text-white',
  ALTERNATIVE: 'bg-emerald-500/90 text-white',
  PARENT: 'bg-amber-500/90 text-white',
  SUMMARY: 'bg-zinc-500/90 text-white',
  FULL_STORY: 'bg-zinc-500/90 text-white',
};

export default function RelatedAnime({ relations }) {
  if (!Array.isArray(relations) || relations.length === 0) return null;

  const sorted = [...relations].sort((a, b) => {
    const ai = RELATION_ORDER.indexOf(a.relation_type);
    const bi = RELATION_ORDER.indexOf(b.relation_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0f0f13] p-4 sm:p-6 md:rounded-[28px] md:p-8">
      <h2 className="mb-3 text-[15px] font-semibold text-white sm:mb-4 sm:text-[17px]">Related Anime</h2>

      {/*
        Mobile (below sm): plain vertical list — full-width rows, small
        square thumbnail, divider lines, relation badge inline next to
        the title instead of overlaid on the (too-small-to-read-on) image.
        sm and up: same data, switches to the horizontal scrolling poster
        cards from before.
      */}
      <div className="flex flex-col divide-y divide-white/[0.06] sm:flex-row sm:gap-3 sm:divide-y-0 sm:overflow-x-auto sm:pb-2 md:gap-4 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
        {sorted.map((rel) => {
          const label = RELATION_LABELS[rel.relation_type] || (rel.relation_type || 'Related').replace('_', ' ');
          const badgeStyle = RELATION_STYLE[rel.relation_type] || 'bg-zinc-600/90 text-white';

          return (
            // Linking with the numeric AniList id as the slug — the app's
            // own getAnimeIdBySlugAction() already treats a purely numeric
            // slug as the anilistId directly, so this resolves instantly
            // with no title-matching/search fallback needed.
            <Link
              key={`${rel.relation_type}-${rel.anilist_id}`}
              href={`/watch/${rel.anilist_id}/ep-1`}
              className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 sm:block sm:w-[130px] sm:shrink-0 sm:py-0 sm:first:pt-0 sm:last:pb-0 md:w-[150px]"
            >
              <div className="relative w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.08] sm:w-full sm:rounded-xl sm:shadow-[0_12px_30px_-14px_rgba(0,0,0,0.85)] sm:transition-transform sm:duration-300 sm:group-hover:scale-[1.03]">
                <img
                  src={rel.poster || 'https://placehold.co/300x450/111111/f97316?text=No+Image'}
                  alt={rel.title}
                  style={{ aspectRatio: '2 / 3' }}
                  className="w-full object-cover"
                  loading="lazy"
                />
                {/* Overlay badge — desktop card only, the mobile thumbnail is too small for it to read */}
                <div className="absolute inset-0 hidden bg-gradient-to-t from-black/90 via-black/10 to-transparent sm:block" />
                <span
                  className={`absolute left-1.5 top-1.5 hidden rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:inline-block ${badgeStyle}`}
                >
                  {label}
                </span>
              </div>

              <div className="min-w-0 flex-1 sm:mt-1.5 sm:flex-none">
                {/* Inline badge — mobile list row only */}
                <span
                  className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:hidden ${badgeStyle}`}
                >
                  {label}
                </span>
                <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white transition-colors group-hover:text-orange-300 sm:text-[12px]">
                  {rel.title}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-[#8a8a92] sm:mt-0.5 sm:text-[10.5px]">
                  <MdLiveTv className="h-3 w-3 text-orange-400" />
                  {rel.episodes ?? '?'} eps
                  {rel.year ? ` · ${rel.year}` : ''}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}