'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthProvider';
import { addMediaToList, getUserMediaList, getUserMediaRatings, removeMediaFromList, saveUserMediaRating } from '@/lib/action/media-library.actions';
import { ArrowLeft, Bookmark, Check, Clapperboard, Heart, Loader2, Star, Tv } from 'lucide-react';
import MediaCard from './MediaCard';

function imageUrl(path, size = 'w500') {
  return typeof path === 'string' && /^\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(path)
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : null;
}

function formatRuntime(minutes) {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

export default function MediaDetailPage({ type, id, details = null, season = null, tmdbError = '', seasonError = '' }) {
  const isTv = type === 'tv';
  const mediaType = isTv ? 'tv' : 'movie';
  const Icon = isTv ? Tv : Clapperboard;
  const { user, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState({ favorite: false, watchlist: false });
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [ratingSaved, setRatingSaved] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const identity = { mediaType, tmdbId: id };

  const loadUserMedia = useCallback(async () => {
    if (!user) {
      setSaved({ favorite: false, watchlist: false });
      setRating(5);
      setReview('');
      setRatingSaved(false);
      return;
    }
    setSaved({ favorite: false, watchlist: false });
    setRating(5);
    setReview('');
    setRatingSaved(false);
    setError('');
    try {
      const [favorites, watchlist, ratings] = await Promise.all([
        getUserMediaList('favorite'), getUserMediaList('watchlist'), getUserMediaRatings(),
      ]);
      const failed = [favorites, watchlist, ratings].find((result) => result.error);
      if (failed) {
        setError(failed.error);
        return;
      }
      setSaved({
        favorite: (favorites.entries || []).some((entry) => entry.media_type === mediaType && entry.tmdb_id === Number(id)),
        watchlist: (watchlist.entries || []).some((entry) => entry.media_type === mediaType && entry.tmdb_id === Number(id)),
      });
      const existing = (ratings.entries || []).find((entry) => entry.media_type === mediaType && entry.tmdb_id === Number(id));
      if (existing) {
        setRating(Number(existing.rating));
        setReview(existing.review || '');
        setRatingSaved(true);
      }
    } catch {
      setError('Unable to load your saved media details.');
    }
  }, [id, mediaType, user]);

  useEffect(() => {
    const timer = setTimeout(() => loadUserMedia(), 0);
    return () => clearTimeout(timer);
  }, [loadUserMedia]);

  async function toggleList(listType) {
    if (!user) {
      setMessage('Sign in to save titles to your personal library.');
      return;
    }
    setBusy(listType);
    setError('');
    setMessage('');
    try {
      const result = saved[listType]
        ? await removeMediaFromList({ ...identity, listType })
        : await addMediaToList({ ...identity, listType });
      if (result.error) setError(result.error);
      else setSaved((current) => ({ ...current, [listType]: !current[listType] }));
    } catch {
      setError('Unable to update your saved list. Please try again.');
    } finally {
      setBusy('');
    }
  }

  async function submitRating(event) {
    event.preventDefault();
    if (!user) {
      setMessage('Sign in to rate titles and save a private review.');
      return;
    }
    setBusy('rating');
    setError('');
    setMessage('');
    try {
      const result = await saveUserMediaRating({ ...identity, rating, review });
      if (result.error) setError(result.error);
      else {
        setRatingSaved(true);
        setMessage('Your rating is saved privately.');
      }
    } catch {
      setError('Unable to save your rating. Please try again.');
    } finally {
      setBusy('');
    }
  }

  const title = details?.title || `${isTv ? 'TV Show' : 'Movie'} · TMDB ${id}`;
  const posterUrl = imageUrl(details?.poster_path, 'w500');
  const backdropUrl = imageUrl(details?.backdrop_path, 'w1280');
  const date = details?.release_date || details?.first_air_date;
  const score = Number(details?.vote_average);

  return (
    <main className="min-h-[75vh] bg-[#09090b] pb-14 text-white">
      <div className="mx-auto max-w-[1450px] px-4 pt-8 sm:px-6 lg:px-8">
        <Link href={isTv ? '/tv' : '/movies'} className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to {isTv ? 'TV Shows' : 'Movies'}</Link>
      </div>
      <section className="relative mt-5 overflow-hidden border-y border-white/[0.08] bg-zinc-950">
        {backdropUrl && <img src={backdropUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/90 to-[#09090b]/55" />
        <div className="relative mx-auto grid max-w-[1450px] gap-7 px-4 py-9 sm:grid-cols-[220px_1fr] sm:px-6 sm:py-12 lg:grid-cols-[280px_1fr] lg:gap-10 lg:px-8">
          <div className="mx-auto w-full max-w-[220px] sm:max-w-none">
            {posterUrl ? <img src={posterUrl} alt={`${title} poster`} className="aspect-[2/3] w-full rounded-2xl border border-white/10 object-cover shadow-2xl" /> : <div className="grid aspect-[2/3] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/30"><Icon className="h-12 w-12" /></div>}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">{isTv ? 'TV show' : 'Movie'}{date ? ` · ${date.slice(0, 4)}` : ''}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
            {details?.tagline && <p className="mt-2 text-sm italic text-white/55">{details.tagline}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/65">
              {date && <span className="rounded-md border border-white/10 px-2.5 py-1.5">{isTv ? 'First aired' : 'Released'} {date}</span>}
              {score > 0 && <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{score.toFixed(1)} / 10</span>}
              {!isTv && formatRuntime(details?.runtime) && <span className="rounded-md border border-white/10 px-2.5 py-1.5">{formatRuntime(details.runtime)}</span>}
              {isTv && details?.number_of_seasons != null && <span className="rounded-md border border-white/10 px-2.5 py-1.5">{details.number_of_seasons} seasons</span>}
              {details?.status && <span className="rounded-md border border-white/10 px-2.5 py-1.5">{details.status}</span>}
            </div>
            {details?.genres?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{details.genres.map((genre) => <span key={genre.id} className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-white/75">{genre.name}</span>)}</div>}
            <h2 className="mt-6 text-sm font-bold text-white">Overview</h2>
            {details ? <p className="mt-2 max-w-3xl text-sm leading-7 text-white/65">{details.overview || 'No overview is available for this title.'}</p> : <p role={tmdbError ? 'alert' : undefined} className="mt-2 max-w-3xl text-sm leading-7 text-white/55">{tmdbError || 'Title information is unavailable.'}</p>}
            {!isTv && <Link href={`/watch/movie/${id}`} className="mt-5 w-fit rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400">Open movie player</Link>}
            {details?.videos?.some((video) => video.site === 'YouTube' && video.type === 'Trailer') && <div className="mt-5 flex flex-wrap gap-2">{details.videos.filter((video) => video.site === 'YouTube' && video.type === 'Trailer').slice(0, 2).map((video) => <a key={video.key} href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-orange-300/25 bg-orange-300/10 px-3 py-2 text-xs font-semibold text-orange-100 hover:bg-orange-300/15">Watch trailer: {video.name}</a>)}</div>}
          </div>
        </div>
      </section>

      {isTv && details?.seasons?.length > 0 && <section className="mx-auto mt-8 max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Seasons & Episodes</h2><p className="mt-1 text-xs text-white/45">Episode information from TMDB. Playback is not configured.</p></div><label className="flex items-center gap-2 text-xs text-white/55">Season<select value={season?.season_number ?? ''} onChange={(event) => { window.location.href = `?season=${encodeURIComponent(event.target.value)}`; }} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white">{details.seasons.map((item) => <option key={item.id} value={item.season_number}>{item.name}</option>)}</select></label></div>
        {seasonError && <p role="alert" className="mt-4 text-sm text-red-200">{seasonError}</p>}
        {season?.episodes?.length ? <div className="mt-4 divide-y divide-white/[0.07] rounded-xl border border-white/[0.08] bg-white/[0.02]">{season.episodes.map((episode) => <article key={episode.id} className="flex gap-4 p-4 sm:p-5">{imageUrl(episode.still_path, 'w300') ? <img src={imageUrl(episode.still_path, 'w300')} alt="" className="hidden aspect-video w-40 shrink-0 rounded-lg object-cover sm:block" /> : <div className="hidden aspect-video w-40 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-xs text-white/30 sm:grid">Episode {episode.episode_number}</div>}<div className="flex-1"><p className="text-xs font-semibold text-orange-300">Episode {episode.episode_number}{episode.air_date ? ` · ${episode.air_date}` : ''}</p><h3 className="mt-1 font-bold">{episode.name}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-white/50">{episode.overview || 'No episode description is available.'}</p><Link href={`/watch/tv/${id}/season/${season.season_number}/episode/${episode.episode_number}`} className="mt-3 inline-flex rounded-lg border border-orange-300/25 px-3 py-1.5 text-xs font-semibold text-orange-100 hover:bg-orange-300/10">Open episode player</Link></div></article>)}</div> : !seasonError && <p className="mt-4 text-sm text-white/45">No episode information is available for this season.</p>}
      </section>}

      {details?.credits?.cast?.length > 0 && <section className="mx-auto mt-8 max-w-[1450px] px-4 sm:px-6 lg:px-8"><h2 className="text-xl font-bold">Cast</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">{details.credits.cast.slice(0, 12).map((person) => <div key={person.id} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="text-sm font-semibold">{person.name}</p>{person.character && <p className="mt-1 text-xs text-white/45">{person.character}</p>}</div>)}</div></section>}
      {details?.recommendations?.length > 0 && <section className="mx-auto mt-8 max-w-[1450px]"><MediaRecommendations title="Recommended" items={details.recommendations} /></section>}
      {details?.similar?.length > 0 && <section className="mx-auto mt-4 max-w-[1450px]"><MediaRecommendations title="Similar titles" items={details.similar} /></section>}

      <section className="mx-auto mt-8 max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
          <h2 className="text-lg font-bold">Your library</h2>
          {!authLoading && !user && <p className="mt-2 text-sm text-white/50">Sign in to save this title or rate it.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={authLoading || busy === 'watchlist'} onClick={() => toggleList('watchlist')} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold transition hover:border-orange-300/40 disabled:opacity-50"><Bookmark className="h-4 w-4" />{busy === 'watchlist' ? 'Saving…' : saved.watchlist ? 'In Watchlist' : 'Add to Watchlist'}{saved.watchlist && <Check className="h-4 w-4 text-emerald-400" />}</button>
            <button type="button" disabled={authLoading || busy === 'favorite'} onClick={() => toggleList('favorite')} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold transition hover:border-orange-300/40 disabled:opacity-50"><Heart className={`h-4 w-4 ${saved.favorite ? 'fill-rose-400 text-rose-400' : ''}`} />{busy === 'favorite' ? 'Saving…' : saved.favorite ? 'Favorited' : 'Add to Favorites'}{saved.favorite && <Check className="h-4 w-4 text-emerald-400" />}</button>
          </div>
          <form onSubmit={submitRating} className="mt-6 grid gap-3 border-t border-white/[0.07] pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="media-rating" className="text-sm font-semibold">Your rating</label>
              <select id="media-rating" value={rating} onChange={(event) => setRating(Number(event.target.value))} className="rounded-lg border border-white/10 bg-[#121216] px-3 py-2 text-sm text-white">
                {Array.from({ length: 19 }, (_, index) => (index + 2) / 2).map((value) => <option key={value} value={value}>{value.toFixed(1)} / 10</option>)}
              </select>
              {ratingSaved && <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><Star className="h-3.5 w-3.5 fill-current" /> Saved privately</span>}
            </div>
            <label htmlFor="media-review" className="text-xs text-white/55">Private review (optional)</label>
            <textarea id="media-review" value={review} onChange={(event) => setReview(event.target.value)} maxLength={5000} rows={3} placeholder="Write a private note about this title" className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30" />
            <button type="submit" disabled={authLoading || busy === 'rating'} className="inline-flex w-fit items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-50">{busy === 'rating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}{ratingSaved ? 'Update rating' : 'Save rating'}</button>
          </form>
          {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      </section>
    </main>
  );
}

function MediaRecommendations({ title, items }) {
  return <div className="px-4 sm:px-6 lg:px-8"><h2 className="text-xl font-bold">{title}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">{items.slice(0, 12).map((item) => <MediaCard key={`${item.media_type}-${item.id}`} media={item} />)}</div></div>;
}
