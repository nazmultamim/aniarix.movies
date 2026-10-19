"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Library,
  Activity,
  ScrollText,
  ShieldAlert,
  Settings,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Player Providers", href: "/admin/catalog", icon: Library },
  { label: "Watch Activity", href: "/admin/activity", icon: Activity },
  { label: "Audit Logs", href: "/admin/audit", icon: ScrollText },
  { label: "Security", href: "/admin/security", icon: ShieldAlert },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 shrink-0 border-r border-border bg-card
        flex flex-col transition-transform duration-200 lg:static lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md card-lan flex items-center justify-center">
              <span className="font-display font-bold text-sm text-white">AX</span>
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-lg text-foreground tracking-tight">
                AniArix Movie
              </p>
              <p className="text-[10px] text-muted-foreground -mt-1">Admin Console</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Manage
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="rounded-lg bg-secondary/60 border border-border p-3">
              <p className="text-xs font-medium text-foreground">Supabase project</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              AniArix Movie · ap-southeast-2
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground">Existing project</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
