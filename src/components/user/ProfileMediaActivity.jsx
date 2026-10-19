'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, Heart, History, Loader2, Star } from 'lucide-react';
import { getWatchHistory } from '@/lib/action/Getwatchhistory';
import { getUserMediaList, getUserMediaRatings } from '@/lib/action/media-library.actions';

export default function ProfileMediaActivity() {
  const [data, setData] = useState({ history: [], watchlist: [], favorites: [], ratings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getWatchHistory(8), getUserMediaList('watchlist'), getUserMediaList('favorite'), getUserMediaRatings()])
      .then(([history, watchlist, favorites, ratings]) => {
        if (!active) return;
        const failed = [history, watchlist, favorites, ratings].find((result) => result.error);
        setError(failed?.error || '');
        setData({ history: history.entries || [], watchlist: watchlist.entries || [], favorites: favorites.entries || [], ratings: ratings.entries || [] });
      })
      .catch(() => { if (active) setError('Unable to load your media activity.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-base font-bold text-white"><History className="h-4 w-4 text-orange-300" /> Your movie and TV activity</h3><p className="mt-1 text-xs text-white/45">Private activity and saved lists for your account.</p></div>
      {!loading && <div className="flex flex-wrap gap-2 text-xs text-white/60"><Count icon={Bookmark} label="Watchlist" value={data.watchlist.length} /><Count icon={Heart} label="Favorites" value={data.favorites.length} /><Count icon={Star} label="Ratings" value={data.ratings.length} /></div>}
    </div>
    {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-orange-300" /></div> : error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : data.history.length ? <div className="mt-4 divide-y divide-white/[0.06]">{data.history.map((entry) => {
      const tv = entry.media_type === 'tv';
      const hasEpisode = tv && entry.season_number != null && entry.episode_number != null;
      const href = hasEpisode
        ? `/watch/tv/${entry.tmdb_id}/season/${entry.season_number}/episode/${entry.episode_number}`
        : tv ? `/tv/${entry.tmdb_id}` : `/watch/movie/${entry.tmdb_id}`;
      const subtitle = hasEpisode ? `Season ${entry.season_number} · Episode ${entry.episode_number}` : tv ? `TV series · ${entry.status.replaceAll('_', ' ')}` : `Movie · ${entry.status.replaceAll('_', ' ')}`;
      return <Link key={entry.id} href={href} className="flex items-center justify-between gap-4 py-3 hover:bg-white/[0.02]">
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{entry.title || `${tv ? 'TV Show' : 'Movie'} · TMDB ${entry.tmdb_id}`}</span><span className="mt-1 block text-xs capitalize text-white/45">{subtitle}</span></span>
        <ArrowRight className="h-4 w-4 shrink-0 text-orange-300" />
      </Link>;
    })}</div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/45">Your watch activity will appear here.</p>}
  </section>;
}

function Count({ icon: Icon, label, value }) {
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5"><Icon className="h-3.5 w-3.5" />{label}: {value}</span>;
}
