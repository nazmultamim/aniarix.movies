import Link from 'next/link';
import { getCanonicalUrl, siteConfig } from '@/lib/site-config';

export const metadata = {
  title: 'About AniArix Movie',
  description: siteConfig.description,
  alternates: { canonical: getCanonicalUrl('/about') },
};

const features = ['Movie and TV discovery', 'Search and genre browsing', 'Personal watchlist and favorites', 'Continue Watching progress', 'Responsive viewing experience'];

export default function AboutPage() {
  return (
    <main className="min-h-[75vh] bg-[#09090b] px-4 py-10 text-white sm:px-6">
      <article className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">AniArix Movie</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Discover stories for every screen</h1>
        <p className="mt-5 text-base leading-7 text-white/65">AniArix Movie is being shaped into a clear, personal place to discover movies and TV shows. Browse by format, explore collections, and keep the titles you care about close.</p>
        <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
          <h2 className="text-xl font-bold">What you can explore</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => <li key={feature} className="flex items-center gap-3 text-sm text-white/65"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />{feature}</li>)}
          </ul>
        </section>
        <section className="mt-8 rounded-2xl border border-orange-400/15 bg-orange-400/[0.04] p-6">
          <h2 className="text-lg font-bold">Catalog and playback setup</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Movie and TV metadata and playback providers are not connected yet. Catalog pages show clear setup states until those integrations are ready.</p>
          <Link href="/movies" className="mt-4 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">Explore Movies</Link>
        </section>
        <p className="mt-10 text-sm text-white/55">Questions or feedback? Visit the <Link href="/contact" className="font-semibold text-orange-300 underline underline-offset-4">Contact page</Link>.</p>
      </article>
    </main>
  );
}
