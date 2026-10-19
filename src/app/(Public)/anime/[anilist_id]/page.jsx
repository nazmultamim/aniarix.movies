import { permanentRedirect } from 'next/navigation';

export default function LegacyAnimeDetailRoute() {
  permanentRedirect('/movies');
}
