'use client';

import { useEffect, useRef, useState } from 'react';
import AnimeCard from '@/components/layout/AnimeCard';
import Pagination from '@/components/ui/Pagination';
import { getTrendingAnimeAction } from '@/lib/action/Getanimeaction';
import { getStableAnimeIdentity } from '@/lib/anime-display';

export default function TrendingAnimeBrowseClient({
  initialItems = [],
  initialTotalPages = 1,
  initialError = null,
  pageSize = 24,
}) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getTrendingAnimeAction({ page, limit: pageSize });

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
      } else {
        setItems(result.items ?? []);
        setTotalPages(result.pagination?.totalPages || 1);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  function handlePageChange(nextPage) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="mb-3 text-center font-display text-2xl font-black text-white md:text-3xl">
          Trending Anime
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Browse the most popular anime right now.
        </p>

        {error && (
          <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground/60">No trending anime found.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((anime, index) => (
                <AnimeCard
                  key={getStableAnimeIdentity(anime, `anime:${index}`)}
                  anime={anime}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                lastPage={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
