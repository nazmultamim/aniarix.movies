'use client';

import { useRef, useState } from 'react';
import { upsertWatchProgress } from '@/lib/action/watch.actions';

/** @param {{providers:Array<{id:string,name:string,key:string,kind:'native'|'iframe',url:string}>,mediaType:'movie'|'tv',tmdbId:number,title:string,posterPath?:string|null,seasonNumber?:number|null,episodeNumber?:number|null}} props */
export default function PlaybackSource({ providers, mediaType, tmdbId, title, posterPath, seasonNumber = null, episodeNumber = null, resumePosition = 0 }) {
  const [selectedId, setSelectedId] = useState(providers[0]?.id || '');
  const provider = providers.find((item) => item.id === selectedId) || providers[0];
  const videoRef = useRef(null);
  const lastSavedAt = useRef(0);
  const lastEventTime = useRef(0);
  const [saveState, setSaveState] = useState('');
  const [playbackState, setPlaybackState] = useState('Loading media…');

  if (!provider) return <p role="status" className="px-5 text-center text-sm text-white/60">No verified source is available.</p>;

  async function persist(force = false) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.currentTime) || !Number.isFinite(video.duration)) return;
    const now = Math.max(Date.now(), lastEventTime.current + 1);
    if (!force && now - lastSavedAt.current < 15_000) return;
    lastSavedAt.current = now;
    lastEventTime.current = now;
    setSaveState('Saving progress…');
    try {
      const result = await upsertWatchProgress({
        mediaType,
        tmdbId,
        seasonNumber: mediaType === 'tv' ? seasonNumber : null,
        episodeNumber: mediaType === 'tv' ? episodeNumber : null,
        title,
        poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
        currentTimeSeconds: Math.floor(video.currentTime),
        durationSeconds: Math.floor(video.duration),
        server: provider.key,
        eventAt: new Date(now).toISOString(),
      });
      setSaveState(result.error ? 'Progress could not be saved.' : 'Progress saved');
    } catch {
      setSaveState('Progress could not be saved.');
    }
  }

  return <div className="relative h-full w-full">
    {providers.length > 1 && <label className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white">Source<select value={provider.id} onChange={(event) => setSelectedId(event.target.value)} className="bg-transparent" aria-label="Playback source">{providers.map((item) => <option key={item.id} value={item.id} className="bg-zinc-900">{item.name}</option>)}</select></label>}
    {provider.kind === 'native' ? <>
      <video key={provider.id} ref={videoRef} src={provider.url} controls playsInline preload="metadata" className="h-full w-full" aria-label={`Play ${title}`} onLoadedMetadata={(event) => { const video = event.currentTarget; if (resumePosition > 0 && resumePosition < video.duration) video.currentTime = resumePosition; setPlaybackState(''); }} onWaiting={() => setPlaybackState('Buffering…')} onPlaying={() => setPlaybackState('')} onError={() => setPlaybackState('Playback could not be loaded from this provider.')} onTimeUpdate={() => persist()} onPause={() => persist(true)} onEnded={() => persist(true)} />
      {(playbackState || saveState) && <p aria-live="polite" className="absolute bottom-2 right-3 rounded bg-black/70 px-2 py-1 text-[11px] text-white/70">{playbackState || saveState}</p>}
    </> : <iframe title={`Playback via ${provider.name}`} src={provider.url} className="h-full w-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" />}
  </div>;
}
