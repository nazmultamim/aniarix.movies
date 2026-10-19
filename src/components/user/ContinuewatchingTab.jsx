'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clapperboard, Loader2, Tv } from 'lucide-react';
import { getContinueWatching } from '@/lib/action/Getwatchhistory';

function formatTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remaining = Math.floor(value % 60);
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export default function ContinueWatching() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getContinueWatching(20).then((result) => {
      if (!active) return;
      setEntries(result.entries ?? []);
      setError(result.error || '');
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError('Unable to load your recent progress.');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-orange-400" /></div>;

  return (
    <section className="space-y-5">
      <div><h2 className="text-lg font-bold text-white">Continue Watching</h2><p className="mt-1 text-sm text-white/45">Your latest saved movie and episode progress.</p></div>
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3 text-sm text-red-300">{error}</p>}
      {entries.length ? <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => {
          const tv = entry.media_type === 'tv';
          const Icon = tv ? Tv : Clapperboard;
          const playbackHref = tv
            ? `/watch/tv/${entry.tmdb_id}/season/${entry.season_number}/episode/${entry.episode_number}`
            : `/watch/movie/${entry.tmdb_id}`;
          const progress = Math.max(0, Math.min(100, Number(entry.progress_percent) || 0));
          return <article key={entry.id} className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            {entry.poster ? <img src={entry.poster} alt="" className="h-24 w-16 shrink-0 rounded-md object-cover" /> : <div className="grid h-24 w-16 shrink-0 place-items-center rounded-md bg-white/[0.05] text-white/35"><Icon className="h-6 w-6" /></div>}
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-white">{entry.title || `${tv ? 'TV Show' : 'Movie'} · TMDB ${entry.tmdb_id}`}</h3>
              <p className="mt-1 text-xs text-white/45">{tv ? `Season ${entry.season_number} · Episode ${entry.episode_number}` : 'Movie'} · {Math.round(progress)}%</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-400" style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-[11px] text-white/40">{formatTime(entry.current_time_seconds)} of {formatTime(entry.duration_seconds)}</p>
              <Link href={playbackHref} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 hover:text-orange-200"><ArrowRight className="h-3.5 w-3.5" /> Resume watching</Link>
            </div>
          </article>;
        })}
      </div> : !error ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center"><Clapperboard className="mx-auto h-8 w-8 text-white/25" /><h3 className="mt-4 font-semibold text-white/80">Nothing to continue yet</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/45">Saved movie and episode progress will appear here.</p></div> : null}
    </section>
  );
}
