import { Home, Search, ArrowLeft } from "lucide-react";
import notFoundIllustration from "@/app/assets/notfound.png";
import Link from "next/link";

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  // Deterministic pseudo-random values keep SSR and hydration in sync.
  const seed = (i + 1) * 9973;
  const rand = (offset) => ((seed * (offset + 3)) % 1000) / 1000;

  return {
    left: 10 + rand(1) * 80,
    top: 10 + rand(2) * 80,
    delay: rand(3) * 5,
    duration: 4 + rand(4) * 4,
  };
});

export default function NotFoundPage() {
  return (
    <div className="relative flex items-center justify-center overflow-hidden bg-background px-4 py-20">
      {/* Keyframe definitions for custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.9; }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulseGlow 6s ease-in-out infinite;
        }
        .animate-float-particle {
          animation: floatParticle 5s ease-in-out infinite;
        }
      `}</style>

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-orange-500/15 blur-[100px] animate-pulse-glow" />
        <div className="absolute right-1/4 bottom-1/3 h-96 w-96 rounded-full bg-[oklch(0.65_0.18_30)]/10 blur-[120px] animate-pulse-glow [animation-delay:-2s]" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[90px] animate-pulse-glow [animation-delay:-4s]" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {PARTICLES.map((particle, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-orange-500/60 shadow-[0_0_8px_rgba(255,106,0,0.8)] animate-float-particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="font-display relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Illustration with float animation */}
        <div className="relative mb-2 animate-float">
          <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-orange-500/20 blur-3xl" />
          <img
            src={notFoundIllustration.src}
            alt="404 — page not found"
            className="mx-auto h-64 w-auto drop-shadow-[0_20px_50px_rgba(255,90,0,0.35)] md:h-80"
          />
        </div>

        {/* Headline */}
        <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">
          Lost in the{" "}
          <span className="text-orange-500">AniArix ?</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
          The page you&apos;re searching for has been spirited away. Let&apos;s get you back to the
          main timeline.
        </p>

        {/* Action buttons */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/home"
            className="bg-orange-500 group inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-black shadow-[0_16px_50px_-12px_rgba(255,90,0,0.75)] transition-all hover:scale-[1.03] hover:shadow-[0_20px_60px_-12px_rgba(255,90,0,0.9)]"
          >
            <Home className="h-4 w-4" />
            Back to Home
            <ArrowLeft className="h-4 w-4 rotate-0 transition-transform group-hover:-translate-x-0.5" />
          </Link>

          <a href="/search" className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card/60 px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-orange-500/50 hover:bg-card hover:text-orange-500">
            <Search className="h-4 w-4" />
            Search Movies & TV
          </a>
        </div>

        {/* Decorative code tag */}
        <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
          ERROR CODE: 404 — NOT FOUND
        </div>
      </div>
    </div>
  );
}
