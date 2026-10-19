'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  History,
  List,
  // Heart,
  Settings,
} from 'lucide-react';

function resolveAvatar(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export default function ProfileDropdown({
  user,
  profile,
  onLogout,
  href = '/admin/dash',
  className = 'relative inline-block',
  buttonTestId = 'button-profile-menu',
  profileLinkTestId = 'link-profile',
  logoutTestId = 'button-logout',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const displayName =
    profile?.full_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'User';

  const initialAvatar = resolveAvatar(
    profile?.avatar_url,
    profile?.avatar,
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
  );

  const [localAvatar, setLocalAvatar] = useState(initialAvatar);
  const initial = (displayName?.[0] || 'U').toUpperCase();
  const isAdmin = (profile?.role || user?.app_metadata?.role) === 'admin';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on 'Escape' key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep local avatar in sync if parent props change
  useEffect(() => {
    const next = resolveAvatar(
      profile?.avatar_url,
      profile?.avatar,
      user?.user_metadata?.avatar_url,
      user?.user_metadata?.picture,
    );
    setLocalAvatar(next);
  }, [profile, user]);

  // Listen for global profile updates
  useEffect(() => {
    function onProfileUpdated(e) {
      const avatar = resolveAvatar(e?.detail?.avatar, e?.detail?.avatar_url);
      if (avatar) setLocalAvatar(avatar);
    }
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, []);

  if (!user) return null;

  const menuItems = [
    {
      label: 'Profile',
      href:  '/user/dash/profile',
      icon: UserIcon,
      testId: profileLinkTestId,
    },
  ];

  if (!isAdmin) {
    menuItems.push(
      { label: 'Continue Watching', href: '/user/dash/continue', icon: History },  
      // { label: 'Favourites', href: '/user/dash/favourite', icon: Heart },
      { label: 'My List', href: '/user/dash/mylist', icon: List },
      { label: 'Settings', href: '/user/dash/settings', icon: Settings },
    );
  }

  return (
    <div className={className} ref={containerRef}>
      {/* Avatar Trigger Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex items-center justify-center rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 transition-all duration-200"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User Profile Menu"
        data-testid={buttonTestId}
      >
        <div className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full border border-white/10 bg-zinc-900 shadow-md group-hover:border-orange-500/50 group-hover:scale-105 transition-all duration-200">
          {localAvatar ? (
            <img
              src={localAvatar}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={() => setLocalAvatar('')}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-zinc-800 via-zinc-900 to-orange-550 font-semibold text-zinc-100 text-sm">
              {initial}
            </div>
          )}
        </div>
      </button>

      {/* Dropdown Card */}
      <div
        className={`absolute right-0 mt-2.5 w-50 rounded-2xl border border-white/[0.08] bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out z-50 ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
        role="menu"
      >
        {/* User Info Header */}
        <div className="flex items-center gap-3 px-3 py-3 border-b border-white/[0.06] mb-1">
       
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-zinc-100 truncate">
                {displayName}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20">
                  Admin
                </span>
              )}
            </div>
            {user.email && (
              <span className="text-xs text-zinc-400 truncate mt-0.5">
                {user.email}
              </span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-0.5">
          {isAdmin && (
            <Link
              href={href}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              role="menuitem"
            >
              <LayoutDashboard className="h-4 w-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
              <span>Admin Dashboard</span>
            </Link>
          )}

          {menuItems.map(({ label, href: itemHref, icon: Icon, testId }) => (
            <Link
              key={label}
              href={itemHref}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-orange-400/10 hover:text-white transition-colors"
              data-testid={testId}
              role="menuitem"
            >
              <Icon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Logout Section */}
        <div className="mt-1 pt-1 border-t border-white/[0.06]">
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            data-testid={logoutTestId}
            role="menuitem"
          >
            <LogOut className="h-4 w-4 text-rose-400/80 group-hover:text-rose-300 transition-colors" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
