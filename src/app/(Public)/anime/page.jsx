import { permanentRedirect } from 'next/navigation';

export default function LegacyAnimeRoute() {
  permanentRedirect('/movies');
}
