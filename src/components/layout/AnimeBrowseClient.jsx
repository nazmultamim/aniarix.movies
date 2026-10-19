'use client';

import { useEffect, useRef, useState } from 'react';
import AnimeCard from '@/components/layout/AnimeCard';
import Pagination from '@/components/ui/Pagination';
import { getAnimeListAction } from '@/lib/action/Getanimeaction';
import { getStableAnimeIdentity } from '@/lib/anime-display';

export default function AnimeBrowseClient({
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

      const result = await getAnimeListAction({ page, pageSize });

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
        <h1 className="text-2xl text-center md:text-3xl font-display font-black text-white mb-8">
          Browse Anime
        </h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground/60 py-20">No anime found.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
