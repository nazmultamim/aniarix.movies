'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  ChevronLeft,
  Maximize,
  ScanEye,
  SkipForward,
  SkipBack,
  PlayCircle,
  Scissors,
  Captions,
  Mic,
  Loader2,
  Search,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { DEFAULT_SERVER, SERVERS, buildEmbedUrl } from '@/services/servers.config';
import { buildMegaPlayFallbackUrls } from '@/services/Megaplay.service';
import { handlePlayerMessage, getProgressEntry } from '@/services/progressTracker.service';
import { slugify } from '@/lib/slugify';
import { saveProgressThrottled, saveProgressNow, resetThrottle } from '@/services/watchHistory.client';
import { getWatchProgress } from '@/lib/action/Getwatchhistory';
import StatusModal from '@/components/ui/Statusmodal';
import { useAuth } from '@/lib/context/AuthProvider';



const EPISODES_PER_PAGE = 100;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function WatchPlayer({ initialAnimeId = null, initialAnimeIdentity = null, initialAnime = null, initialEpisode = 1 }) {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();

  const { user } = useAuth();

  const slugParam = Array.isArray(routeParams?.slug) ? routeParams.slug[0] : routeParams?.slug;
  const animeIdentity = {
    // `initialAnimeId` is retained strictly as the legacy AniList prop.
    // Never infer an AniList ID from a generic `anime.id`.
    anilistId: initialAnimeIdentity?.anilistId ?? initialAnime?.anilistId ?? initialAnime?.anilist_id ?? initialAnimeId ?? null,
    malId: initialAnimeIdentity?.malId ?? initialAnime?.malId ?? initialAnime?.mal_id ?? null,
  };
  const { anilistId, malId } = animeIdentity;
  const progressId = anilistId || (malId ? `mal-${malId}` : null);
  const hasStreamingIdentity = Boolean(anilistId || malId);
  const routeSlug = slugParam || initialAnime?.slug || slugify(initialAnime?.title_english || initialAnime?.title || anilistId || malId || 'watch');
  const initialTitle = initialAnime?.title_english || initialAnime?.title || 'Now Watching';
  const initialPoster = initialAnime?.poster_image || initialAnime?.poster || initialAnime?.banner || '';

  const [pageTitle, setPageTitle] = useState(initialTitle);
  const [posterUrl, setPosterUrl] = useState(initialPoster);
  const routeEpisodeParam = Array.isArray(routeParams?.ep) ? routeParams.ep[0] : routeParams?.ep;

  const hasExplicitEpisodeRef = useRef(Boolean(routeEpisodeParam));
  const resumeCheckedRef = useRef(false);

  const episodeFromUrl = parseInt(String(routeEpisodeParam || `ep-${initialEpisode || 1}`).replace(/^ep-/, ''), 10) || Number(initialEpisode) || 1;
  const initialEpisodeNumber = Math.max(1, episodeFromUrl);
  const initialTotalEpisodes = clamp(
    Math.max(Number(initialAnime?.episodes) || 1, initialEpisodeNumber),
    1,
    5000
  );
  const [totalEpisodes, setTotalEpisodes] = useState(() =>
    initialTotalEpisodes
  );
  const [episode, setEpisode] = useState(() => clamp(initialEpisodeNumber, 1, initialTotalEpisodes));
  const [language, setLanguage] = useState(() =>
    searchParams.get('lang') === 'dub' ? 'dub' : 'sub'
  );
  const [serverId, setServerId] = useState(() => {
    const requestedServer = searchParams.get('server');
    const selectedServer = SERVERS.find((server) => server.id === requestedServer);
    const supportsIdentity = (server) => server?.supportedIds?.some((idType) => (
      (idType === 'anilist' && Boolean(anilistId)) || (idType === 'mal' && Boolean(malId))
    ));
    return selectedServer && supportsIdentity(selectedServer) ? selectedServer.id : DEFAULT_SERVER;
  });
  const [autoNext, setAutoNext] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoSkip, setAutoSkip] = useState(false);
  const [theatreMode, setTheatreMode] = useState(false);
  const [pageIndex, setPageIndex] = useState(() => Math.floor((episode - 1) / EPISODES_PER_PAGE));
  const [playerLoading, setPlayerLoading] = useState(true);
  const [megaplayFallback, setMegaplayFallback] = useState(null);
  const [resumeTime, setResumeTime] = useState(0);

  // ── Episode list panel — layout + search ──
  const [episodeLayout, setEpisodeLayout] = useState('grid'); // 'grid' | 'list'
  const [episodeSearch, setEpisodeSearch] = useState('');

  // ── Watch status (Watching/Completed/On-Hold/Dropped/Plan to Watch) ──
  const [currentStatus, setCurrentStatus] = useState('watching');

  const primaryEmbedUrl = buildEmbedUrl(serverId, animeIdentity, episode, language);
  const embedUrl = megaplayFallback?.primaryUrl === primaryEmbedUrl
    ? megaplayFallback.url
    : primaryEmbedUrl;
  const latestProgressRef = useRef({ currentTime: 0, duration: 0, completed: false });
  const contextRef = useRef({ anilistId, malId, episode, language, serverId, pageTitle, posterUrl });
  contextRef.current = { anilistId, malId, episode, language, serverId, pageTitle, posterUrl };

  const playerWrapRef = useRef(null);
  const serverSectionRef = useRef(null);

  useEffect(() => {
    const nextEpisode = clamp(Number(initialEpisode) || 1, 1, 5000);

    setTotalEpisodes((currentTotal) => Math.max(currentTotal, nextEpisode));
    setEpisode((currentEpisode) => (currentEpisode === nextEpisode ? currentEpisode : nextEpisode));
    setPageIndex(Math.floor((nextEpisode - 1) / EPISODES_PER_PAGE));
  }, [initialEpisode]);

  useEffect(() => {
    if (!hasStreamingIdentity || resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;

    getWatchProgress(animeIdentity).then((result) => {
      const entry = result?.entry;
      if (!entry) return;

      if (entry.status) {
        setCurrentStatus(entry.status);
      }

      if (hasExplicitEpisodeRef.current) return;

      const dbEpisode = clamp(Number(entry.episode) || 1, 1, 5000);
      const dbLanguage = entry.language === 'dub' ? 'dub' : 'sub';
      const dbServer = SERVERS.some((s) => s.id === entry.server) ? entry.server : DEFAULT_SERVER;

      setTotalEpisodes((current) => Math.max(current, dbEpisode));
      setEpisode(dbEpisode);
      setLanguage(dbLanguage);
      setServerId(dbServer);
      setPageIndex(Math.floor((dbEpisode - 1) / EPISODES_PER_PAGE));
      setPlayerLoading(true);

      syncUrl(dbEpisode, dbLanguage, dbServer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anilistId, malId]);

  const syncUrl = useCallback((nextEpisode, nextLanguage, nextServer = serverId) => {
    const params = new URLSearchParams();
    if (nextLanguage) params.set('lang', nextLanguage);
    if (nextServer) params.set('server', nextServer);
    const query = params.toString();
    router.replace(`/watch/${routeSlug}/ep-${nextEpisode}${query ? `?${query}` : ''}`, { scroll: false });
  }, [router, routeSlug, serverId]);

  const handleEpisodeSelect = useCallback((num) => {
    const clamped = clamp(num, 1, totalEpisodes);

    if (hasStreamingIdentity) {
      saveProgressNow({
        anilistId,
        malId,
        title: pageTitle,
        poster: posterUrl,
        episode,
        language,
        currentTimeSeconds: Math.floor(latestProgressRef.current.currentTime || 0),
        durationSeconds: Math.floor(latestProgressRef.current.duration || 0),
        server: serverId,
        completed: latestProgressRef.current.completed,
      });
    }

    setEpisode(clamped);
    setPageIndex(Math.floor((clamped - 1) / EPISODES_PER_PAGE));
    setPlayerLoading(true);
    setResumeTime(0);
    latestProgressRef.current = { currentTime: 0, duration: 0, completed: false };
    resetThrottle();
    syncUrl(clamped, language);
  }, [anilistId, episode, hasStreamingIdentity, language, malId, pageTitle, posterUrl, serverId, syncUrl, totalEpisodes]);

  const handleLanguageSelect = useCallback((lang) => {
    const nextLang = lang === 'dub' ? 'dub' : 'sub';

    if (hasStreamingIdentity) {
      saveProgressNow({
        anilistId,
        malId,
        title: pageTitle,
        poster: posterUrl,
        episode,
        language,
        currentTimeSeconds: Math.floor(latestProgressRef.current.currentTime || 0),
        durationSeconds: Math.floor(latestProgressRef.current.duration || 0),
        server: serverId,
        completed: latestProgressRef.current.completed,
      });
    }

    setLanguage(nextLang);
    setPlayerLoading(true);
    resetThrottle();
    syncUrl(episode, nextLang);
  }, [anilistId, episode, hasStreamingIdentity, language, malId, pageTitle, posterUrl, serverId, syncUrl]);

  const handleServerSelect = useCallback((nextServerId) => {
    const server = SERVERS.find((item) => item.id === nextServerId);
    if (!server) return;
    const supported = server.supportedIds?.some((idType) => (
      (idType === 'anilist' && Boolean(anilistId)) || (idType === 'mal' && Boolean(malId))
    ));
    if (!supported) return;

    if (hasStreamingIdentity) {
      saveProgressNow({
        anilistId,
        malId,
        title: pageTitle,
        poster: posterUrl,
        episode,
        language,
        currentTimeSeconds: Math.floor(latestProgressRef.current.currentTime || 0),
        durationSeconds: Math.floor(latestProgressRef.current.duration || 0),
        server: serverId,
        completed: latestProgressRef.current.completed,
      });
    }

    setServerId(server.id);
    setPlayerLoading(true);
    resetThrottle();
    syncUrl(episode, language, server.id);
  }, [anilistId, episode, hasStreamingIdentity, language, malId, pageTitle, posterUrl, serverId, syncUrl]);

  useEffect(() => {
    function handleMessage(event) {
      handlePlayerMessage(
        event,
        { anilistId: progressId, episode, serverId, language },
        {
          onProgress: (entry) => {
            setPlayerLoading(false);

            latestProgressRef.current = {
              currentTime: entry.currentTime || 0,
              duration: entry.duration || 0,
              completed: entry.status === 'completed',
            };

            if (hasStreamingIdentity) {
              saveProgressThrottled({
                anilistId,
                malId,
                title: pageTitle,
                poster: posterUrl,
                episode,
                language,
                currentTimeSeconds: Math.floor(entry.currentTime || 0),
                durationSeconds: Math.floor(entry.duration || 0),
                server: serverId,
                completed: entry.status === 'completed',
                status: entry.status === 'completed' ? 'completed' : currentStatus,
              });
            }

            if (entry.status === 'completed') {
              setResumeTime(0);
              setCurrentStatus('completed');
            }
          },
          onComplete: () => {
            if (hasStreamingIdentity) {
              saveProgressNow({
                anilistId,
                malId,
                title: pageTitle,
                poster: posterUrl,
                episode,
                language,
                currentTimeSeconds: Math.floor(latestProgressRef.current.currentTime || 0),
                durationSeconds: Math.floor(latestProgressRef.current.duration || 0),
                server: serverId,
                completed: true,
                status: 'completed',
              });
            }
            setCurrentStatus('completed');

            if (autoNext && episode < totalEpisodes) {
              handleEpisodeSelect(episode + 1);
            }
          },
          onError: (entry) => {
            const fallbackUrls = serverId === 'megaplay'
              ? buildMegaPlayFallbackUrls(animeIdentity, episode, language)
              : [];
            const previousAttempts = megaplayFallback?.primaryUrl === primaryEmbedUrl
              ? megaplayFallback.attemptedUrls
              : [primaryEmbedUrl];
            const nextUrl = fallbackUrls.find((url) => !previousAttempts.includes(url));

            if (nextUrl) {
              setMegaplayFallback({
                primaryUrl: primaryEmbedUrl,
                url: nextUrl,
                attemptedUrls: [...previousAttempts, embedUrl, nextUrl],
              });
              setPlayerLoading(true);
              return;
            }

            setPlayerLoading(false);
            console.error('Player error:', entry);
          },
          onPlaying: () => {
            setPlayerLoading(false);
          },
        }
      );
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [anilistId, autoNext, embedUrl, primaryEmbedUrl, episode, handleEpisodeSelect, hasStreamingIdentity, language, malId, pageTitle, posterUrl, progressId, serverId, totalEpisodes, currentStatus]);

  useEffect(() => {
    if (!progressId || !episode) return;

    const existing = getProgressEntry(progressId, episode);
    const resume = existing && existing.status !== 'completed' ? Math.floor(existing.currentTime || 0) : 0;
    const frame = window.requestAnimationFrame(() => {
      setResumeTime(resume);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [episode, progressId, serverId]);

  useEffect(() => {
    return () => {
      const ctx = contextRef.current;
      const progress = latestProgressRef.current;
      if ((ctx.anilistId || ctx.malId) && progress.currentTime > 0) {
        saveProgressNow({
          anilistId: ctx.anilistId,
          malId: ctx.malId,
          title: ctx.pageTitle,
          poster: ctx.posterUrl,
          episode: ctx.episode,
          language: ctx.language,
          currentTimeSeconds: Math.floor(progress.currentTime || 0),
          durationSeconds: Math.floor(progress.duration || 0),
          server: ctx.serverId,
          completed: progress.completed,
        });
      }
    };
  }, []);

  function handleExpand() {
    playerWrapRef.current?.requestFullscreen?.();
  }

  function scrollToServers() {
    serverSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }


  const trimmedSearch = episodeSearch.trim();
  const visibleEpisodeNumbers = useMemo(() => {
    if (trimmedSearch) {
      const matches = [];
      for (let n = 1; n <= totalEpisodes; n++) {
        if (String(n).includes(trimmedSearch)) matches.push(n);
        if (matches.length >= 300) break; // sane cap
      }
      return matches;
    }
    const pageStart = pageIndex * EPISODES_PER_PAGE + 1;
    const pageEnd = Math.min(pageStart + EPISODES_PER_PAGE - 1, totalEpisodes);
    return Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);
  }, [trimmedSearch, totalEpisodes, pageIndex]);

  if (!hasStreamingIdentity) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-card/50 p-10 text-center text-muted-foreground/60">
        No anime selected.{' '}
        <Link href="/anime" className="text-orange-400 hover:underline">
          Browse anime
        </Link>
      </div>
    );
  }

  const showLoading = playerLoading && Boolean(embedUrl);
  const pageCount = Math.ceil(totalEpisodes / EPISODES_PER_PAGE);
  const pageStart = pageIndex * EPISODES_PER_PAGE + 1;
  const pageEnd = Math.min(pageStart + EPISODES_PER_PAGE - 1, totalEpisodes);
  

  return (
    <div className="flex flex-col gap-3">
      <div className={`grid grid-cols-1 ${theatreMode ? '' : 'xl:grid-cols-[minmax(0,4fr)_minmax(280px,1fr)]'} w-full items-start gap-4`}>
        {/* ── Left: player + info card ── */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0a0a] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <div ref={playerWrapRef} className="relative aspect-video overflow-hidden bg-black">
            {showLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1a0f0f] via-[#120a0a] to-black">
                <div className="flex  items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
                </div>
              </div>
            )}
            {embedUrl ? (
              <iframe
                key={embedUrl}
                src={embedUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                allowFullScreen
                onLoad={() => setPlayerLoading(false)}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-sm text-muted-foreground/60">
                No streaming source available.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] px-3 py-2.5 md:px-4">
            <ToolbarButton icon={Maximize} label="Expand" onClick={handleExpand} />
            <ToolbarButton icon={ScanEye} label="Focus" active={theatreMode} onClick={() => setTheatreMode((value) => !value)} />
            <ToolbarButton icon={SkipForward} label="AutoNext" active={autoNext} onClick={() => setAutoNext((value) => !value)} />
            <ToolbarButton icon={PlayCircle} label="AutoPlay" active={autoPlay} onClick={() => setAutoPlay((value) => !value)} />
            <ToolbarButton icon={Scissors} label="AutoSkip" active={autoSkip} onClick={() => setAutoSkip((value) => !value)} />
            <span className="mx-1 hidden h-5 w-px bg-white/[0.08] sm:block" />
            <ToolbarButton icon={SkipBack} label="Prev" onClick={() => handleEpisodeSelect(episode - 1)} disabled={episode <= 1} />
            <ToolbarButton icon={SkipForward} label="Next" onClick={() => handleEpisodeSelect(episode + 1)} disabled={episode >= totalEpisodes} />
            <span className="mx-1 hidden h-5 w-px bg-white/[0.08]" />

            {user && anilistId && (
              <StatusModal
                anilistId={anilistId}
                title={pageTitle}
                poster={posterUrl}
                episode={episode}
                language={language}
                server={serverId}
                currentStatus={currentStatus}
                onStatusChange={setCurrentStatus}
              />
            )}
          </div>

          {/* ── Info card: "You are watching" + servers/sub-dub ── */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr] border-t border-white/[0.06]">
            <div className="flex flex-col justify-between gap-3 p-4 sm:border-r border-white/[0.06]">
              <div className="min-w-0">

                <h3 className="text-sm font-black text-white mt-0.5 truncate">{pageTitle} | Ep: {episode}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground/40">
                  If the player is not loading, try refreshing the page.
                </p>
              </div>

            </div>

            <div ref={serverSectionRef} className="p-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <LangPill
                  icon={Captions}
                  label="Sub"
                  active={language === 'sub'}
                  onClick={() => handleLanguageSelect('sub')}
                />
                <LangPill
                  icon={Mic}
                  label="Dub"
                  active={language === 'dub'}
                  onClick={() => handleLanguageSelect('dub')}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SERVERS.map((server) => (
                  <ServerPill
                    key={server.id}
                    label={server.label}
                    active={serverId === server.id}
                    disabled={!server.supportedIds?.some((idType) => (
                      (idType === 'anilist' && Boolean(anilistId)) || (idType === 'mal' && Boolean(malId))
                    ))}
                    onClick={() => handleServerSelect(server.id)}
                  />
                ))}
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground/40">
                If the current server doesn't work, try one of the others above.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: episodes panel ── */}
        {!theatreMode && (
          <div className="w-full self-start overflow-hidden rounded-2xl border border-white/[0.08] bg-card/50 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3.5">
              <h2 className="text-sm font-bold text-white">Episodes</h2>
              <div className="flex items-center gap-1">
                <LayoutToggleButton
                  icon={LayoutGrid}
                  active={episodeLayout === 'grid'}
                  onClick={() => setEpisodeLayout('grid')}
                  label="Grid view"
                />
                <LayoutToggleButton
                  icon={ListIcon}
                  active={episodeLayout === 'list'}
                  onClick={() => setEpisodeLayout('list')}
                  label="List view"
                />
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={episodeSearch}
                  onChange={(e) => setEpisodeSearch(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Search episode number"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground/30 outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {!trimmedSearch && pageCount > 1 && (
              <div className="flex items-center justify-between gap-2 px-3 pt-3">
                <button
                  onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                  disabled={pageIndex === 0}
                  className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold tracking-wide text-muted-foreground/60">
                  {String(pageStart).padStart(3, '0')}-{String(pageEnd).padStart(3, '0')}
                </span>
                <button
                  onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
                  disabled={pageIndex >= pageCount - 1}
                  className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {visibleEpisodeNumbers.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground/40">
                No episodes match "{trimmedSearch}".
              </p>
            ) : episodeLayout === 'grid' ? (
              <div className="grid max-h-[420px] grid-cols-6 gap-2 overflow-y-auto p-3">
                {visibleEpisodeNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleEpisodeSelect(num)}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all ${num === episode
                        ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-[0_2px_12px_rgba(249,115,22,0.4)]'
                        : 'border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:border-orange-500/40 hover:text-white'
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto p-3">
                {visibleEpisodeNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleEpisodeSelect(num)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${num === episode
                        ? 'bg-gradient-to-r from-orange-500/20 to-red-600/10 text-orange-300 border border-orange-500/30'
                        : 'border border-transparent text-muted-foreground/70 hover:bg-white/[0.05] hover:text-white'
                      }`}
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${num === episode ? 'bg-orange-500 text-white' : 'bg-white/[0.06] text-muted-foreground/60'
                        }`}
                    >
                      {num}
                    </span>
                    Episode {num}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all disabled:pointer-events-none disabled:opacity-30 ${active
          ? 'border-orange-500/30 bg-orange-500/15 text-orange-300'
          : 'border-transparent text-muted-foreground/70 hover:bg-white/[0.06] hover:text-white'
        }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function LayoutToggleButton({ icon: Icon, active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${active
          ? 'bg-orange-500/15 text-orange-300'
          : 'text-muted-foreground/50 hover:bg-white/[0.06] hover:text-white'
        }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function LangPill({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold transition-all ${active
          ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
          : 'border-white/[0.1] bg-white/[0.04] text-muted-foreground hover:text-white'
        }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ServerPill({ label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg text-center border px-3 py-1.5 text-xs font-bold transition-all ${active
          ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
          : 'border-white/[0.1] bg-white/[0.04] text-muted-foreground hover:text-white'
        } disabled:pointer-events-none disabled:opacity-35`}
    >
      {label}
    </button>
  );
}
