"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, ChevronLeft, ChevronRight, Calendar, Clock3 } from "lucide-react";
import { cacheSelectedAnimeAction, getHeroAnimeSlidesAction } from "@/lib/action/Getanimeaction";
import { getAnimeDisplayTitle, getAnimeExternalIds, getStableAnimeIdentity } from "@/lib/anime-display";
import { slugify } from "@/lib/slugify";

const AUTOPLAY_MS = 7000;
const SWIPE_PX = 50;
const EASE = [0.25, 1, 0.5, 1];

// Shared by loading / empty / loaded so the page never jumps.
// The navbar is fixed and floats over this section.
// Taller than before (was 68vh / 540px / 840px).
const HERO_STYLE = { height: "75vh", minHeight: "580px", maxHeight: "880px" };

// Space reserved for the fixed navbar, so the title/info never touches it.
// Shared by loading / empty / loaded states.
const NAV_CLEARANCE = "pt-28 sm:pt-32 lg:pt-40";
// Space reserved at the bottom for the slider controls.
const CONTROLS_CLEARANCE = "pb-28 sm:pb-32";

const WRAP = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 2xl:px-10";

const pickUrl = (...sources) =>
    sources.find((s) => typeof s === "string" && s.trim()) || null;

const pickBanner = (s) =>
    pickUrl(s?.banner_image, s?.banner, s?.cover, s?.poster_image, s?.poster);
const pickPoster = (s) =>
    pickUrl(s?.poster_image, s?.poster, s?.cover, pickBanner(s));

export function Hhomeimgeslider({ initialSlides = [] }) {
    const reduceMotion = useReducedMotion();
    const [slides, setSlides] = useState(() => (Array.isArray(initialSlides) ? initialSlides : []));
    const [loading, setLoading] = useState(!(Array.isArray(initialSlides) && initialSlides.length > 0));
    const [error, setError] = useState("");
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState(1);
    const [paused, setPaused] = useState(false);
    const sectionRef = useRef(null);
    const barRef = useRef(null);
    const elapsedRef = useRef(0);
    const touchRef = useRef(null);
    const total = slides.length;

    // ── Data ────────────────────────────────────────────────
    useEffect(() => {
        if (Array.isArray(initialSlides) && initialSlides.length > 0) {
            setSlides(initialSlides);
            setLoading(false);
            return;
        }
        let alive = true;
        (async () => {
            setLoading(true);
            setError("");
            const result = await getHeroAnimeSlidesAction();
            if (!alive) return;
            if (result?.error) {
                setSlides([]);
                setError(result.error);
            } else {
                setSlides(result?.items ?? []);
            }
            setLoading(false);
        })();
        return () => {
            alive = false;
        };
    }, [initialSlides]);

    // ── Navigation ──────────────────────────────────────────
    const go = useCallback(
        (index, dir) => {
            if (!total) return;
            setDirection(dir);
            setCurrent((index + total) % total);
        },
        [total]
    );
    const prev = useCallback(() => go(current - 1, -1), [current, go]);
    const next = useCallback(() => go(current + 1, 1), [current, go]);

    // Reset progress whenever the slide changes (declared before the autoplay effect on purpose).
    useEffect(() => {
        elapsedRef.current = 0;
        if (barRef.current) barRef.current.style.transform = "scaleX(0)";
    }, [current]);

    // Autoplay + progress bar driven by ONE clock, so they can never drift apart.
    // Pausing keeps the elapsed time instead of restarting the slide.
    useEffect(() => {
        if (paused || total < 2) return;
        let raf;
        let last = performance.now();
        const tick = (now) => {
            // Clamp: a backgrounded tab would otherwise report a huge delta and skip slides.
            elapsedRef.current += Math.min(now - last, 100);
            last = now;
            const p = Math.min(elapsedRef.current / AUTOPLAY_MS, 1);
            if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
            if (p >= 1) {
                next();
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [paused, total, next]);

    // Preload the upcoming image so transitions never flash empty.
    useEffect(() => {
        if (total < 2) return;
        const upcoming = slides[(current + 1) % total];
        const url = window.innerWidth < 768 ? pickPoster(upcoming) : pickBanner(upcoming);
        if (url) {
            const img = new window.Image();
            img.src = url;
        }
    }, [current, slides, total]);

    const onKeyDown = (e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
    };

    const onTouchStart = (e) => {
        const t = e.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Horizontal intent only, so vertical page scroll is never hijacked.
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            dx < 0 ? next() : prev();
        }
    };

    // ── Derived slide data ──────────────────────────────────
    const slide = slides[current] || null;
    const { anilistId, malId } = getAnimeExternalIds(slide);
    const slideTitle = getAnimeDisplayTitle(slide, "Anime");
    const slug = slide?.slug || slugify(slideTitle);
    const bannerImage = pickBanner(slide);
    const posterImage = pickPoster(slide);
    const watchRoute = anilistId ? slug : malId ? `mal-${malId}` : null;
    const watchHref = watchRoute ? `/watch/${watchRoute}/ep-1` : "/anime";
    const slideKey = getStableAnimeIdentity(slide);

    // ── Loading / empty states ──────────────────────────────
    if (loading) {
        return (
            <section
                className="relative w-full overflow-hidden bg-background"
                style={HERO_STYLE}
                aria-busy="true"
                aria-label="Loading featured anime"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-primary/[0.06]" />
                <div className={`relative z-10 h-full flex items-center ${NAV_CLEARANCE} ${CONTROLS_CLEARANCE} ${WRAP}`}>
                    <div className="flex w-full items-center justify-between gap-10 animate-pulse">
                        <div className="w-full max-w-xl lg:max-w-2xl space-y-4">
                            <div className="h-14 sm:h-20 w-4/5 rounded-lg bg-white/10" />
                            <div className="flex gap-2">
                                <div className="h-7 w-16 rounded-full bg-white/10" />
                                <div className="h-7 w-20 rounded-full bg-white/10" />
                                <div className="h-7 w-20 rounded-full bg-white/10" />
                            </div>
                            <div className="h-4 w-full rounded bg-white/10" />
                            <div className="h-4 w-3/4 rounded bg-white/10" />
                            <div className="h-12 w-40 rounded-xl bg-white/10" />
                        </div>
                        <div className="hidden lg:block w-[215px] aspect-[2/3] rounded-2xl bg-white/10" />
                    </div>
                </div>
            </section>
        );
    }

    if (!slide) {
        return (
            <section
                className="relative w-full overflow-hidden bg-background"
                style={HERO_STYLE}
                aria-label="Featured anime unavailable"
            >
                <div className={`relative z-10 h-full flex items-center ${NAV_CLEARANCE} ${CONTROLS_CLEARANCE} ${WRAP}`}>
                    <div className="max-w-xl">
                        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-foreground">
                            Nothing to feature right now
                        </h1>
                        <p className="mt-4 text-sm sm:text-base text-muted-foreground">
                            {error || "Featured anime couldn't be loaded. Refresh the page, or browse the full catalog."}
                        </p>
                        <Link
                            href="/anime"
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-foreground hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Browse all anime
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    // ── Motion variants ─────────────────────────────────────
    const imgVariants = reduceMotion
        ? { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.4 } }, exit: { opacity: 0, transition: { duration: 0.3 } } }
        : {
            enter: (dir) => ({ opacity: 0, x: dir > 0 ? 48 : -48, scale: 1.05 }),
            center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
            exit: (dir) => ({ opacity: 0, x: dir > 0 ? -48 : 48, transition: { duration: 0.5, ease: "easeIn" } }),
        };

    const contentVariants = {
        enter: { opacity: 0, y: reduceMotion ? 0 : 20 },
        center: { opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.12, ease: EASE } },
        exit: { opacity: 0, y: reduceMotion ? 0 : -12, transition: { duration: 0.25, ease: "easeIn" } },
    };

    const posterVariants = {
        enter: { opacity: 0, scale: reduceMotion ? 1 : 0.94, y: reduceMotion ? 0 : 16 },
        center: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, delay: 0.2, ease: EASE } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
    };

    // ── Meta (deduped: feeds often repeat "Releasing" across fields) ──
    const seen = new Set();
    const claim = (value) => {
        if (!value) return false;
        const key = String(value).trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    };

    const status = slide.status || "";
    const isReleasing = status.toLowerCase() === "releasing";
    const formatLabel = slide.format || slide.type || "";
    const genreList = (
        Array.isArray(slide.genre) ? slide.genre : Array.isArray(slide.genres) ? slide.genres : []
    ).slice(0, 3);
    const description = slide.description || slide.synopsis || "";

    claim(status); // claim first so duplicates of the status are dropped
    const rawAiring = slide.airing || slide.airingStatus;
    const releaseLabel = claim(slide.release) ? slide.release : null;
    const airingLabel = claim(rawAiring) ? rawAiring : null;

    const chip = "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-xs sm:text-[13px] font-medium text-foreground/90 backdrop-blur-md";

    return (
        <section
            ref={sectionRef}
            tabIndex={0}
            aria-roledescription="carousel"
            aria-label={`Featured: ${slideTitle}`}
            className="relative w-full overflow-hidden bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            style={HERO_STYLE}
            onKeyDown={onKeyDown}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            // Mouse only: on touch devices a tap fires pointerenter and would leave autoplay stuck paused.
            onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
            data-testid="hero-slider"
        >
            {/* ── Background ── */}
            <AnimatePresence custom={direction} initial={false}>
                <motion.div
                    key={`bg-${slideKey}`}
                    className="absolute inset-0 z-0"
                    custom={direction}
                    variants={imgVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                >
                    {/* Slow constant zoom; deliberately NOT tied to hover so pausing never makes the image jump. */}
                    <motion.div
                        className="absolute inset-0"
                        initial={{ scale: 1 }}
                        animate={{ scale: reduceMotion ? 1 : 1.07 }}
                        transition={{ duration: 14, ease: "linear" }}
                    >
                        {/* <picture> picks poster on mobile / banner on desktop in CSS: no JS state, no flash on first paint. */}
                        <picture>
                            {posterImage && <source media="(max-width: 767px)" srcSet={posterImage} />}
                            {bannerImage && (
                                <img
                                    src={bannerImage}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                    style={{ objectPosition: slide.focalPoint || "center 25%" }}
                                    fetchPriority={current === 0 ? "high" : "auto"}
                                    decoding="async"
                                />
                            )}
                        </picture>
                    </motion.div>

                    {/* Readability layers */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 md:via-background/55 to-background/10 md:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-[35%] bg-gradient-to-b from-background/70 via-background/20 to-transparent" />
                    {/* Soft brand glow anchoring the content block */}
                    <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_12%_88%,hsl(var(--primary)/0.16),transparent_70%)]" />
                </motion.div>
            </AnimatePresence>

            {/* ── Content ── */}
            <div className={`relative z-10 h-full flex items-center ${NAV_CLEARANCE} ${CONTROLS_CLEARANCE} ${WRAP}`}>
                <div className="flex w-full items-center justify-between gap-10 xl:gap-16">
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={`content-${slideKey}`}
                            variants={contentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="flex w-full max-w-xl lg:max-w-2xl flex-col gap-4 sm:gap-5"
                        >
                            {/* Title */}
                            <h1 className="font-display text-[1.5rem] leading-[1.05] sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground line-clamp-3 [text-shadow:0_4px_32px_hsl(var(--background)/0.7)]">
                                {slideTitle}
                            </h1>

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-2">
                                {status && (
                                    <span
                                        className={`${chip} ${isReleasing ? "!border-emerald-400/30 !bg-emerald-400/10 text-emerald-300" : ""}`}
                                    >
                                        {isReleasing && (
                                            <span className="relative flex h-2 w-2">
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                            </span>
                                        )}
                                        {status}
                                    </span>
                                )}
                                {formatLabel && <span className={chip}>{formatLabel}</span>}
                                {releaseLabel && (
                                    <span className={chip}>
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        {releaseLabel}
                                    </span>
                                )}
                                {airingLabel && (
                                    <span className={chip}>
                                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                                        {airingLabel}
                                    </span>
                                )}
                            </div>

                            {/* Genres: plain text, quieter than the chips above */}
                            {genreList.length > 0 && (
                                <p className="text-sm font-medium text-foreground/70">{genreList.join(", ")}</p>
                            )}

                            {/* Description */}
                            {description && (
                                <p className="max-w-xl text-sm sm:text-base leading-relaxed text-foreground/75 line-clamp-2 sm:line-clamp-3">
                                    {description}
                                </p>
                            )}

                            {/* CTA */}
                            <div className="mt-1">
                                <Link
                                    data-testid="hero-watch-btn"
                                    href={watchHref}
                                    onClick={() => {
                                        void cacheSelectedAnimeAction(slide);
                                    }}
                                    className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.8)] transition-transform duration-200 hover:scale-[1.03] active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    <span className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 ease-out group-hover:translate-y-0" />
                                    <Play className="relative z-10 h-4 w-4 shrink-0 fill-current" />
                                    <span className="relative z-10">Watch now</span>
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Poster card: the one "hero" flourish. Desktop only, nothing is lost on mobile. */}
                    <AnimatePresence mode="wait">
                        {posterImage && (
                            <motion.div
                                key={`poster-${slideKey}`}
                                variants={posterVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="hidden lg:block shrink-0"
                            >
                                <Link
                                    href={watchHref}
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    onClick={() => {
                                        void cacheSelectedAnimeAction(slide);
                                    }}
                                    className="relative block w-[190px] xl:w-[230px] aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-20px_hsl(var(--primary)/0.5)] transition-transform duration-500 hover:-translate-y-1.5 hover:scale-[1.02]"
                                >
                                    <img
                                        src={posterImage}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Bottom controls: aligned to the page grid ── */}
            <div className="absolute inset-x-0 bottom-5 sm:bottom-8 z-20">
                <div className={`flex items-center justify-between gap-4 ${WRAP}`}>
                    <div className="flex items-center gap-4 min-w-0">
                        <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground/70">
                            {String(current + 1).padStart(2, "0")}
                            <span className="text-foreground/35"> / {String(total).padStart(2, "0")}</span>
                        </span>

                        <div className="flex items-center gap-1.5 sm:gap-2" role="tablist" aria-label="Choose slide">
                            {slides.map((_, i) => {
                                const active = i === current;
                                return (
                                    <button
                                        key={i}
                                        role="tab"
                                        aria-selected={active}
                                        aria-label={`Go to slide ${i + 1}`}
                                        data-testid={`hero-dot-${i}`}
                                        onClick={() => go(i, i > current ? 1 : -1)}
                                        // Tall hit area, thin visual bar: 3px targets are miserable to tap.
                                        className="group flex h-6 items-center focus-visible:outline-none"
                                        style={{ width: active ? 44 : 16, transition: "width 300ms" }}
                                    >
                                        <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-foreground/20 group-hover:bg-foreground/35 group-focus-visible:ring-2 group-focus-visible:ring-ring transition-colors">
                                            {active && (
                                                <span
                                                    ref={barRef}
                                                    className="absolute inset-0 origin-left rounded-full bg-primary"
                                                    style={{ transform: "scaleX(0)" }}
                                                />
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            data-testid="hero-prev-btn"
                            onClick={prev}
                            aria-label="Previous slide"
                            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-foreground/80 backdrop-blur-md transition-all duration-200 hover:bg-white/15 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                            data-testid="hero-next-btn"
                            onClick={next}
                            aria-label="Next slide"
                            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-foreground/80 backdrop-blur-md transition-all duration-200 hover:bg-white/15 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}