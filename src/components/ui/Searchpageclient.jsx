'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnimeCard from '@/components/layout/AnimeCard';
import { searchAnimeAction, getTopAnimeAction } from '@/lib/action/Searchanimeaction';
import { getStableAnimeIdentity } from '@/lib/anime-display';
import {
  Search, X, ChevronLeft, ChevronRight, Loader2, Filter, SlidersVertical,
  LayoutGrid, List as ListIcon, Star, ChevronDown, ChevronUp
} from 'lucide-react';



const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Isekai',
  'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
  'Supernatural', 'Thriller',
];

const TYPES = [
  { value: 'tv', label: 'TV' },
  { value: 'movie', label: 'Movie' },
  { value: 'ova', label: 'OVA' },
  { value: 'special', label: 'Special' },
  { value: 'ona', label: 'ONA' },
  { value: 'music', label: 'Music' },
];

const STATUSES = [
  { value: 'airing', label: 'Airing' },
  { value: 'complete', label: 'Completed' },
  { value: 'upcoming', label: 'Upcoming' },
];

const RATINGS = [
  { value: 'g', label: 'G — All Ages' },
  { value: 'pg', label: 'PG — Children' },
  { value: 'pg13', label: 'PG-13' },
  { value: 'r17', label: 'R-17+' },
  { value: 'r', label: 'R — Mild Nudity' },
  { value: 'rx', label: 'Rx — Hentai' },
];

const SEASONS = [
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1962 }, (_, i) => String(CURRENT_YEAR - i));

const SORT_OPTIONS = [
  { value: 'popularity:asc', label: 'Most Popular' },
  { value: 'score:desc', label: 'Highest Rated' },
  { value: 'start_date:desc', label: 'Recently Updated' },
  { value: 'title:asc', label: 'Title A-Z' },
];

const EMPTY_FILTERS = {
  query: '', genre: '', type: '', status: '', rating: '', year: '', season: '',
};

function getPaginationPages(currentPage, totalPages, maxButtons = 5) {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfWindow = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = start + maxButtons - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - maxButtons + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] focus:border-orange-500/50 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white outline-none transition-colors cursor-pointer"
      >
        <option value="" className="bg-[#151015]">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt} className="bg-[#151015]">
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-90 text-muted-foreground/40 pointer-events-none" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />
      ))}
    </div>
  );
}

export default function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get('q') || '';

  const [pendingFilters, setPendingFilters] = useState({ ...EMPTY_FILTERS, query: initialQ });
  const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS, query: initialQ });
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0].value);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const [topAnime, setTopAnime] = useState([]);
  const resultsRef = useRef(null);

  const hasSearched = Object.values(appliedFilters).some((v) => v);

  const runSearch = useCallback(async (filters, targetPage) => {
    setLoading(true);
    setError(null);

    const [orderBy, sort] = sortValue.split(':');
    const result = await searchAnimeAction({ ...filters, orderBy, sort }, targetPage, 20);

    if (result.error) {
      setError(result.error);
      setItems([]);
    } else {
      setItems(result.items);
      setPagination(result.pagination);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortValue]);

  useEffect(() => {
    if (initialQ.trim()) {
      setAppliedFilters((prev) => ({ ...prev, query: initialQ }));
      runSearch({ ...EMPTY_FILTERS, query: initialQ }, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getTopAnimeAction(1, 6).then((res) => {
      if (res.success) setTopAnime(res.items);
    });
  }, []);

  function handleApplyFilters(e) {
    e?.preventDefault();
    const q = pendingFilters.query.trim();
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    setAppliedFilters(pendingFilters);
    setPage(1);
    runSearch(pendingFilters, 1);
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
    runSearch(appliedFilters, nextPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearFilters() {
    setPendingFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setItems([]);
    setPagination({ totalPages: 1, totalCount: 0 });
    router.replace('/search');
  }

  const hasResults = items.length > 0;
  const totalPages = pagination.totalPages || 1;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-orange-900/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 md:px-8 py-8 md:py-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 xl:gap-10 items-start">

          {/* ── Main column: filters + results ── */}
          <div ref={resultsRef} className="min-w-0">
            <h1 className="text-xl md:text-2xl font-display font-black text-white mb-6">
              Find Your Perfect Anime
            </h1>

            <form onSubmit={handleApplyFilters} className="mb-8">
              {/* Search Bar + Mobile Toggle */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                  <input
                    value={pendingFilters.query}
                    onChange={(e) => setPendingFilters((p) => ({ ...p, query: e.target.value }))}
                    placeholder="Search by title…"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/35 outline-none focus:border-orange-500/50 transition-colors"
                  />
                  {pendingFilters.query && (
                    <button
                      type="button"
                      onClick={() => setPendingFilters((p) => ({ ...p, query: '' }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Toggle filters dropdown button (Mobile Only) */}
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                  aria-expanded={showMobileFilters}
                  aria-controls="mobile-filter-options"
                  className="md:hidden flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white hover:bg-white/[0.08] transition-colors shrink-0"
                >
                  <SlidersVertical className="w-4 h-4 text-orange-400" />
                  
                </button>
              </div>

              {/* Filter Select Fields Container */}
              <div
                id="mobile-filter-options"
                className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-3 overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
                  showMobileFilters
                    ? 'max-h-[32rem] opacity-100 translate-y-0 pointer-events-auto'
                    : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
                } md:max-h-none md:opacity-100 md:translate-y-0 md:pointer-events-auto`}
              >
                <SelectField
                  value={pendingFilters.genre}
                  onChange={(v) => setPendingFilters((p) => ({ ...p, genre: v }))}
                  options={GENRES}
                  placeholder="Genre"
                />
                <SelectField
                  value={pendingFilters.season}
                  onChange={(v) => setPendingFilters((p) => ({ ...p, season: v }))}
                  options={SEASONS}
                  placeholder="Season"
                />
                <SelectField
                  value={pendingFilters.year}
                  onChange={(v) => setPendingFilters((p) => ({ ...p, year: v }))}
                  options={YEARS}
                  placeholder="Year"
                />
                <SelectField
                  value={pendingFilters.type}
                  onChange={(v) => setPendingFilters((p) => ({ ...p, type: v }))}
                  options={TYPES}
                  placeholder="Type"
                />
                <SelectField
                  value={pendingFilters.status}
                  onChange={(v) => setPendingFilters((p) => ({ ...p, status: v }))}
                  options={STATUSES}
                  placeholder="Status"
                />
                <SelectField
                  value={pendingFilters.rating}
                  onChange={(v) => setPendingFilters((p) => ({ ...p, rating: v }))}
                  options={RATINGS}
                  placeholder="Rating"
                />
                <SelectField
                  value={sortValue}
                  onChange={setSortValue}
                  options={SORT_OPTIONS}
                  placeholder="Sort by"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-bold hover:shadow-[0_0_16px_rgba(249,115,22,0.4)] transition-all"
                >
                  <Filter className="w-4 h-4" /> Filter
                </button>
                {hasSearched && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-muted-foreground/60 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear all
                  </button>
                )}
              </div>
            </form>

            {/* Status bar */}
            {hasSearched && (
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-muted-foreground/60">
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                    </span>
                  ) : (
                    <>
                      <span className="text-white font-semibold">{pagination.totalCount.toLocaleString()}</span> results
                      {totalPages > 1 && <span className="ml-1 text-muted-foreground/40">— page {page} of {totalPages}</span>}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-orange-500/15 text-orange-400' : 'text-muted-foreground/40 hover:text-white'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-orange-500/15 text-orange-400' : 'text-muted-foreground/40 hover:text-white'}`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {loading && <SkeletonGrid />}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-white font-bold text-lg">Something went wrong</p>
                <p className="text-muted-foreground/60 text-sm max-w-xs">{error}</p>
                <button
                  onClick={() => runSearch(appliedFilters, page)}
                  className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {!hasSearched && !loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <p className="text-white font-bold text-xl">Find your next anime</p>
                <p className="text-muted-foreground/50 text-sm max-w-xs">
                  Search by title or use the filters above, then hit Filter.
                </p>
              </div>
            )}

            {hasSearched && !loading && !error && !hasResults && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                
                <p className="text-white font-bold text-lg">No results found</p>
                <p className="text-muted-foreground/60 text-sm max-w-xs">Try different filters or a different title.</p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-muted-foreground hover:text-white transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}

            {hasResults && !loading && (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {items.map((anime, index) => (
                      <AnimeCard key={getAnimeListKey(anime, index)} anime={anime} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((anime, index) => (
                      <ListRow key={getAnimeListKey(anime, index)} anime={anime} />
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold text-muted-foreground hover:text-white hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {getPaginationPages(page, totalPages).map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                            p === page
                              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                              : 'bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white hover:border-white/20'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold text-muted-foreground hover:text-white hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Sidebar: Top Rated Anime ── */}
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-card/50 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-sm font-bold text-white">Top Rated Anime</h2>
                <p className="text-xs text-muted-foreground/40 mt-0.5">Based on AniList score</p>
              </div>
              <div className="flex flex-col">
                {topAnime.map((anime, i) => (
                  <a
                    key={getAnimeListKey(anime, i)}
                    href={`/anime/${anime.id}`}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors ${i !== 0 ? 'border-t border-white/[0.04]' : ''}`}
                  >
                    <img
                      src={anime.poster_image || 'https://placehold.co/60x84/1a1a1a/444444?text=?'}
                      alt={anime.title_english || anime.title}
                      className="w-12 h-[68px] rounded-md object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                        {anime.title_english || anime.title}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground/50 mt-1">
                        <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                        {anime.score ?? '—'} · {anime.type || '—'}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAnimeListKey(anime, index) {
  return getStableAnimeIdentity(anime, `anime:${index}`);
}

function ListRow({ anime }) {
  const title = anime.title_english || anime.title;
  return (
    <a
      href={`/anime/${anime.id}`}
      className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-card/50 p-3 hover:border-orange-500/30 transition-colors"
    >
      <img
        src={anime.poster_image || 'https://placehold.co/60x84/1a1a1a/444444?text=?'}
        alt={title}
        className="w-14 h-20 rounded-lg object-cover shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white truncate">{title}</p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          {anime.type || '—'} {anime.score != null && `· ★ ${anime.score}`}
        </p>
        {anime.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {anime.genres.slice(0, 3).map((g) => (
              <span key={g} className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
