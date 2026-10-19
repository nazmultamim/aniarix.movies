export const siteConfig = {
  name: 'AniArix Movie',
  shortName: 'AniArix Movie',

  description:
    'Discover movies and TV shows with AniArix Movie. Explore popular, trending, top-rated and upcoming titles in a modern streaming experience.',

  keywords: [
    'AniArix',
    'movies',
    'tv shows',
    'movie discovery',
    'tv series',
    'trending movies',
    'popular movies',
    'top rated movies',
    'upcoming movies',
    'movie genres',
    'watchlist',
    'favorites',
    'continue watching',
  ],

  themeColor: '#0f1116',
  backgroundColor: '#09090b',

  startUrl: '/home',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
};

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

export function getCanonicalUrl(pathname = '/') {
  const baseUrl = getSiteUrl();
  return new URL(pathname, baseUrl).toString();
}
