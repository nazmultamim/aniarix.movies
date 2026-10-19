'use client';

import {
  User, History, List, Settings
} from 'lucide-react';

export const DASHBOARD_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'continue', label: 'Continue Watching', icon: History },
  { id: 'mylist', label: 'Watchlist & Favorites', icon: List },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DashboardNav({ activeTab, onChange }) {
  return (
    <nav className="w-full rounded-2xl border border-white/[0.06] bg-[#0d0b0c]/80 backdrop-blur-xl px-1 sm:px-2 py-2 overflow-x-auto">
      <div className="flex items-center justify-between  gap-0.5 sm:gap-1 sm:min-w-max">
        {DASHBOARD_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-label={label}
              data-testid={`tab-${id}`}
              className={`relative flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white sm:bg-white/[0.06]'
                  : 'text-muted-foreground/60 hover:text-white sm:hover:bg-white/[0.03]'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${isActive ? 'text-orange-400' : ''}`} />
              <span className="hidden sm:inline">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
