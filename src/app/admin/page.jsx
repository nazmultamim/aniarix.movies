"use client";

import { useEffect, useState } from "react";
import { Users, Library, Activity } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import { getAdminDashboardData } from "@/lib/action/admin.actions";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await getAdminDashboardData();
        if (result.error) setError(result.error);
        else {
          setStats(result.stats);
          setActivity(result.activity);
        }
      } catch {
        setError("Unable to load the admin dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-11 rounded bg-secondary overflow-hidden shrink-0">
            {row.poster && (
              <img src={row.poster} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[220px]">{row.title || "Untitled"}</p>
            <p className="text-xs text-muted-foreground">{row.media_type === "tv" ? `Season ${row.season_number ?? "—"} · Episode ${row.episode_number ?? "—"}` : "Movie"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "progress_percent",
      header: "Progress",
      render: (row) => (
        <div className="w-28">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min(100, row.progress_percent || 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {Math.round(row.progress_percent || 0)}%
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={row.status}>{null}</Badge>,
    },
    {
      key: "last_watched_at",
      header: "Last watched",
      render: (row) =>
        row.last_watched_at ? new Date(row.last_watched_at).toLocaleString() : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={loading ? "—" : stats?.userCount ?? 0}
          icon={Users}
        />
        <StatCard
          label="Configured Providers"
          value={loading ? "—" : stats?.providerCount ?? 0}
          icon={Library}
        />
        <StatCard
          label="History Records"
          value={loading ? "—" : stats?.watchCount ?? 0}
          icon={Activity}
        />
      </div>

      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-foreground">Recent Activity</h2>
        </div>
        <DataTable
          columns={columns}
          data={activity}
          loading={loading}
          emptyTitle="No watch activity yet"
          emptyDescription="Playback progress will appear here when users have activity."
        />
      </div>
    </div>
  );
}
