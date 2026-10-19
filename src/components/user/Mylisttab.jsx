'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, Film, Loader2, Star, Trash2 } from 'lucide-react';
import { deleteUserMediaRating, getUserMediaList, getUserMediaRatings, removeMediaFromList } from '@/lib/action/media-library.actions';

const LISTS = [
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'favorite', label: 'Favorites', icon: Heart },
  { id: 'ratings', label: 'My Ratings', icon: Star },
];

function MediaName({ entry }) {
  return <div><p className="font-semibold text-white">{entry.title || `${entry.media_type === 'tv' ? 'TV Show' : 'Movie'} · TMDB ${entry.tmdb_id}`}</p><p className="mt-1 text-xs capitalize text-white/45">{entry.media_type === 'tv' ? 'TV Show' : 'Movie'} · TMDB {entry.tmdb_id}</p></div>;
}

export default function MyListTab() {
  const [activeList, setActiveList] = useState('watchlist');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removingId, setRemovingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = activeList === 'ratings' ? await getUserMediaRatings() : await getUserMediaList(activeList);
      setEntries(result.entries ?? []);
      setError(result.error || '');
    } catch {
      setEntries([]);
      setError('Unable to load this list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeList]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function remove(entry) {
    setRemovingId(entry.id);
    setError('');
    setMessage('');
    try {
      const result = activeList === 'ratings'
        ? await deleteUserMediaRating({ mediaType: entry.media_type, tmdbId: entry.tmdb_id })
        : await removeMediaFromList({ mediaType: entry.media_type, tmdbId: entry.tmdb_id, listType: activeList });
      if (result.error) setError(result.error);
      else {
        setEntries((current) => current.filter((item) => item.id !== entry.id));
        setMessage(`Removed from ${selected.label}.`);
      }
    } catch {
      setError('Unable to remove this item. Please try again.');
    } finally {
      setRemovingId('');
    }
  }

  const selected = LISTS.find((list) => list.id === activeList) || LISTS[0];
  const SelectedIcon = selected.icon;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">My Library</h2>
        <p className="mt-1 text-sm text-muted-foreground/50">Your watchlist, favorites, and private ratings.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06]">
        {LISTS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveList(id)} aria-pressed={activeList === id} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeList === id ? 'border-orange-400 text-white' : 'border-transparent text-white/45 hover:text-white/75'}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3 text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-sm text-emerald-300">{message}</p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-orange-400" /></div> : entries.length ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <article key={entry.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-400/10 text-orange-300"><Film className="h-5 w-5" /></div><div className="min-w-0"><MediaName entry={entry} />{activeList === 'ratings' && <><span className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-amber-300"><Star className="h-3.5 w-3.5 fill-current" />{Number(entry.rating).toFixed(1)}</span>{entry.review && <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{entry.review}</p>}</>}</div></div>
              <button type="button" disabled={removingId === entry.id} onClick={() => remove(entry)} aria-label={`Remove ${entry.media_type} ${entry.tmdb_id} from ${selected.label}`} className="rounded-lg border border-white/10 p-2 text-white/50 transition hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-orange-300/15 bg-orange-300/[0.06] text-orange-300/70"><SelectedIcon className="h-6 w-6" /></div>
          <h3 className="mt-4 font-semibold text-white/80">No {selected.label.toLowerCase()} yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/45">Items saved from movie and TV pages will appear here.</p>
          <Link href="/movies" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"><Film className="h-3.5 w-3.5" /> Explore Movies</Link>
        </div>
      )}
    </section>
  );
}
