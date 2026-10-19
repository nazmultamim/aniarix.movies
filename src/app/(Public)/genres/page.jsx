import MediaBrowsePage from '@/components/layout/MediaBrowsePage';
import { getCanonicalUrl } from '@/lib/site-config';
import { discoverMedia, getGenres, getTmdbErrorMessage } from '@/services/tmdb.service';

export const metadata = { title: 'Genres', description: 'Explore movies and TV shows by genre.', alternates: { canonical: getCanonicalUrl('/genres') } };
export const dynamic = 'force-dynamic';
export default async function GenresPage({ searchParams }) {
  const params = await searchParams;
  const type = params?.type === 'tv' ? 'tv' : 'movie';
  const genreId = /^\d+$/.test(String(params?.genre || '')) ? Number(params.genre) : null;
  let genres = [];
  let selectedGenre = null;
  let items = [];
  let errorMessage = '';
  try {
    const [movieGenres, tvGenres] = await Promise.all([getGenres('movie'), getGenres('tv')]);
    genres = [
      ...movieGenres.map((genre) => ({ ...genre, mediaType: 'movie' })),
      ...tvGenres.map((genre) => ({ ...genre, mediaType: 'tv' })),
    ];
    selectedGenre = genres.find((genre) => genre.id === genreId && genre.mediaType === type);
    const result = selectedGenre ? await discoverMedia(type, { genreIds: [selectedGenre.id] }) : null;
    items = result?.results || [];
  } catch (error) {
    errorMessage = getTmdbErrorMessage(error);
  }
  return <MediaBrowsePage title={selectedGenre ? `${selectedGenre.name} ${type === 'tv' ? 'TV Shows' : 'Movies'}` : 'Genres'} description="Explore movies and TV shows by genre." genres={genres} activeGenre={selectedGenre?.id} activeType={selectedGenre ? type : null} items={items} error={errorMessage} />;
}
