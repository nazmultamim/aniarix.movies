import Link from 'next/link';
import { Clapperboard, Search } from 'lucide-react';

export const metadata = {
  title: 'Playback unavailable',
  description: 'Playback providers are not configured on AniArix Movie yet.',
  robots: { index: false, follow: false },
};

export default function PlaybackUnavailablePage() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#09090b] px-4 py-12 text-center text-white">
      <div className="max-w-lg">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-orange-300/20 bg-orange-300/10 text-orange-300"><Clapperboard className="h-8 w-8" /></div>
        <h1 className="mt-6 text-2xl font-black">Playback is not configured</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">This title cannot be played yet. AniArix Movie will show playback options when a provider has been configured and verified.</p>
        <Link href="/movies" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold hover:bg-orange-400"><Search className="h-4 w-4" /> Browse Movies</Link>
      </div>
    </main>
  );
}
