"use client";

import { Menu, Search, Bell } from "lucide-react";

export default function Topbar({ title, subtitle, onMenuClick, admin }) {
  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="h-full flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-muted-foreground hover:text-foreground shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-lg text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search…"
              className="w-56 pl-9 pr-3 py-2 text-sm rounded-md bg-secondary border border-border
              text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button className="relative text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
          </button>

          <div className="flex items-center gap-2.5 pl-3 border-l border-border">
            <img
              src={admin?.avatar_url || "https://i.pravatar.cc/64?img=12"}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-foreground">
                {admin?.username || "admin"}
              </p>
              <p className="text-[11px] text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}