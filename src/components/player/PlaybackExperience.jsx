import Link from 'next/link';
import { ArrowLeft, Clapperboard, Tv } from 'lucide-react';
import PlaybackSource from './PlaybackSource';

/** @param {{ mediaType: 'movie'|'tv', tmdbId: number, title: string, posterPath?: string|null, seasonNumber?: number|null, episodeNumber?: number|null, episodeTitle?: string|null, providers?: Array<{id:string,name:string,url:string}> }} props */
export default function PlaybackExperience({ mediaType, tmdbId, title, posterPath, seasonNumber = null, episodeNumber = null, episodeTitle = null, providers = [], resumePosition = 0, previousEpisode = null, nextEpisode = null }) {
  const isTv = mediaType === 'tv';
  const Icon = isTv ? Tv : Clapperboard;
  const detailHref = `/${isTv ? 'tv' : 'movie'}/${tmdbId}`;
  const label = isTv ? `Season ${seasonNumber}, Episode ${episodeNumber}` : 'Movie';

  return (
    <main className="min-h-[75vh] bg-[#09090b] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href={detailHref} className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to details</Link>
        <header className="mt-6 flex items-center gap-4">
          {posterPath ? <img src={`https://image.tmdb.org/t/p/w185${posterPath}`} alt="" className="h-20 w-14 rounded-md object-cover" /> : <div className="grid h-20 w-14 place-items-center rounded-md bg-white/5"><Icon className="h-6 w-6 text-white/30" /></div>}
          <div><p className="text-xs font-bold uppercase tracking-widest text-orange-300">{label}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{episodeTitle || title}</h1></div>
        </header>

        <section aria-label="Video player" className="mt-6 grid aspect-video place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black">
          {providers.length === 0 ? (
            <div role="status" className="max-w-md px-6 text-center">
              <Icon className="mx-auto h-10 w-10 text-white/25" />
              <h2 className="mt-4 text-lg font-bold">No verified playback source</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">This title is available for discovery, but no approved player integration is configured for this deployment. Playback controls and progress tracking will appear when a tested provider is available.</p>
            </div>
          ) : (
            <PlaybackSource providers={providers} mediaType={mediaType} tmdbId={tmdbId} title={title} posterPath={posterPath} seasonNumber={seasonNumber} episodeNumber={episodeNumber} resumePosition={resumePosition} />
          )}
        </section>
        {isTv && <nav aria-label="Episode navigation" className="mt-4 flex justify-between gap-3 text-sm">{previousEpisode ? <Link href={`/watch/tv/${tmdbId}/season/${seasonNumber}/episode/${previousEpisode}`} className="rounded-lg border border-white/10 px-3 py-2 text-white/75 hover:text-white">← Previous episode</Link> : <span />}{nextEpisode && <Link href={`/watch/tv/${tmdbId}/season/${seasonNumber}/episode/${nextEpisode}`} className="rounded-lg border border-white/10 px-3 py-2 text-white/75 hover:text-white">Next episode →</Link>}</nav>}
        <p className="mt-3 text-xs text-white/40">{isTv ? `${title} · ${label}` : title} · TMDB {tmdbId} ({mediaType})</p>
      </div>
    </main>
  );
}
