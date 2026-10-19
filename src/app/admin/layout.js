"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

const PAGE_META = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Overview of users, providers and activity",
  },
  "/admin/users": {
    title: "Users",
    subtitle: "Manage accounts and roles",
  },
  "/admin/catalog": {
    title: "Player Providers",
    subtitle: "Manage configured external player providers",
  },
  "/admin/activity": {
    title: "Watch Activity",
    subtitle: "Movie and TV playback progress across users",
  },
  "/admin/audit": {
    title: "Audit Logs",
    subtitle: "Administrative changes recorded by the database",
  },
  "/admin/security": {
    title: "Security",
    subtitle: "Database and auth hardening status",
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "Admin console preferences",
  },
};

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const meta = PAGE_META[pathname] || { title: "Admin" };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
