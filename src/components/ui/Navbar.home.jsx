'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CircleUser, Search, Menu, X, Home, Compass, TrendingUp, ChevronRight, Clapperboard, Tv, Star, Clock3, Heart, Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthProvider';
import AuthModal from '../auth/AuthModal';
import ProfileDropdown from './ProfileDropdown';

const navLinks = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Movies', href: '/movies', icon: Clapperboard },
  { label: 'TV Shows', href: '/tv', icon: Tv },
  { label: 'Trending', href: '/trending', icon: TrendingUp },
  { label: 'Popular', href: '/popular', icon: Compass },
  { label: 'Top Rated', href: '/top-rated', icon: Star },
  { label: 'Upcoming', href: '/upcoming', icon: Clock3 },
  { label: 'Genres', href: '/genres', icon: Bookmark },
  { label: 'Watchlist', href: '/user/dash/mylist', icon: Bookmark },
  { label: 'Favorites', href: '/user/dash/mylist', icon: Heart },
];

// Routes whose first section is a full-bleed hero that the navbar should float over.
// Every other route gets a spacer so content isn't hidden under the fixed navbar.
const OVERLAY_ROUTES = ['/', '/home'];

// Scroll distance (px) before the navbar background fades in.
const SCROLL_THRESHOLD = 10;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileSearchRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const resolvedPathname = pathname ?? '/';
  const isOverlayRoute = OVERLAY_ROUTES.includes(resolvedPathname);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  const openAuthModal = (mode = 'signin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setSidebarOpen(false);
    setSearchOpen(false);
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsHydrated(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // Track scroll position: transparent at the top, glass bar once scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll(); // handles reload with restored scroll position
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Submit search -> navigate to /search?q=...
  const submitSearch = () => {
    const q = searchValue.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSidebarOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSearch();
    }
  };

  // Focus mobile search input when it opens
  useEffect(() => {
    if (searchOpen && mobileSearchRef.current) {
      setTimeout(() => mobileSearchRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await signOut();
    setSidebarOpen(false);
    router.push('/home');
    router.refresh();
  };

  // Solid-ish background when scrolled, or whenever the mobile search drawer is open
  const showGlass = scrolled || searchOpen;

  return (
    <>
      {/* ── Main Navbar (fixed overlay) ─────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${
          showGlass
            ? 'border-white/5 bg-background/60 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.04)]'
            : 'border-transparent bg-transparent backdrop-blur-0 shadow-none'
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8 2xl:px-10">

          {/* Left: hamburger — always visible, opens the sidebar nav */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-muted-foreground hover:text-white transition-all"
            aria-label="Open menu"
            data-testid="button-open-menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.5)]">
              <span className="text-white font-black text-xs leading-none">AX</span>
            </div>
            <span className="font-display text-[22px] sm:text-[24px] font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent tracking-wide">
              AniArix <span className="text-[10px] font-bold tracking-normal text-white/60">MOVIE</span>
            </span>
          </Link>

          {/* Center (desktop): large search bar */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <div className="relative w-full max-w-xl group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                ref={desktopSearchRef}
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search movies and TV shows..."
                className="w-full h-11 bg-white/5 border border-white/8 rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:bg-white/8 focus:border-orange-500/50 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.12),inset_0_0_20px_rgba(249,115,22,0.04)] transition-all"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: mobile search toggle (mobile only) */}
          <button
            onClick={() => setSearchOpen(prev => !prev)}
            className="md:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-muted-foreground hover:text-white transition-all ml-auto"
            aria-label="Toggle search"
            data-testid="button-toggle-search"
          >
            {searchOpen ? <X className="w-5 h-5 text-orange-400" /> : <Search className="w-5 h-5" />}
          </button>

          {/* Right: profile / sign in */}
          <div className="flex items-center shrink-0">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
            ) : user ? (
              <ProfileDropdown user={user} profile={profile} onLogout={handleLogout} />
            ) : (
              <>
                {/* Desktop: labeled button. Same 40px height as the other nav controls. */}
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  data-testid="button-signin"
                  className="hidden md:inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 pl-3.5 pr-5 text-sm font-semibold tracking-wide text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.8)] ring-1 ring-inset ring-white/15 transition-all duration-200 hover:brightness-110 hover:shadow-[0_8px_24px_-8px_rgba(249,115,22,0.9)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <CircleUser className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>Sign in</span>
                </button>

                {/* Mobile: icon only, circular like the avatar it becomes after sign-in */}
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  data-testid="button-signin-mobile"
                  aria-label="Sign in"
                  className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-[0_6px_18px_-6px_rgba(249,115,22,0.8)] ring-1 ring-inset ring-white/15 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <CircleUser className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${searchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-3 border-t border-white/5 bg-background/95">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search movies and TV shows..."
                className="w-full h-11 bg-white/6 border border-orange-500/30 rounded-xl pl-10 pr-10 text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-orange-500/60 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.12)] transition-all"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer: only on pages without a hero, so content isn't hidden under the fixed navbar */}
      {!isOverlayRoute && <div className="h-16" aria-hidden="true" />}

      {/* ── Sidebar Overlay (all breakpoints) ───────────────── */}
      <div className={`fixed inset-0 z-[60] transition-all duration-300 ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          onClick={() => setSidebarOpen(false)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
        />

        <div className={`absolute top-0 left-0 h-full w-72 bg-[#0d0d0f] border-r border-white/8 shadow-[8px_0_40px_rgba(0,0,0,0.6)] flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.4)]">
                <span className="text-white font-black text-xs">AX</span>
              </div>
              <span className="font-display text-[24px] font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                AniArix
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/8 transition-all shrink-0"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar nav links */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Navigation
            </p>
            {navLinks.map(({ label, href, icon: Icon }) => {
              const isActive =
                isHydrated &&
                (label === 'Home'
                  ? OVERLAY_ROUTES.includes(resolvedPathname)
                  : resolvedPathname.startsWith(href));
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={() => { setSidebarOpen(false); setSearchOpen(false); }}
                  className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl mb-1 transition-all group ${isActive
                    ? 'bg-gradient-to-r from-orange-500/15 to-red-500/5 border border-orange-500/20 text-white'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    }`}
                  data-testid={`link-sidebar-${label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-orange-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : ''}`} />
                    </div>
                    <span className="font-semibold text-sm">{label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-60 text-orange-400' : ''}`} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
