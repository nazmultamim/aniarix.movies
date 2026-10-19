"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import { getAdminWatchHistory } from "@/lib/action/admin.actions";

const PAGE_SIZE = 10;

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(p = page) {
    setLoading(true);
    try {
      const result = await getAdminWatchHistory({ page: p, pageSize: PAGE_SIZE });
      if (result.error) setError(result.error);
      else {
        setRows(result.data);
        setCount(result.count);
      }
    } catch {
      setError("Unable to load playback activity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(0), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const columns = [
    {
      key: "title",
      header: "Title / Media",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-11 rounded bg-secondary overflow-hidden shrink-0">
            {row.poster && (
              <img src={row.poster} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[200px]">{row.title || "Untitled"}</p>
            <p className="text-xs text-muted-foreground">
              {row.media_type === "tv" ? `TV · S${row.season_number ?? "—"} · E${row.episode_number ?? "—"}` : "Movie"} · {row.language} · {row.server || "unknown provider"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "user_id",
      header: "User ID",
      render: (row) => (
        <code className="text-xs text-muted-foreground">
          {row.user_id?.slice(0, 8)}…
        </code>
      ),
    },
    {
      key: "position",
      header: "Position",
      render: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDuration(row.current_time_seconds)} / {formatDuration(row.duration_seconds)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={row.status} />,
    },
    {
      key: "last_watched_at",
      header: "Last watched",
      render: (row) =>
        row.last_watched_at ? new Date(row.last_watched_at).toLocaleString() : "—",
    },
  ];

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive">{error}</p> : null}
      <div className="rounded-lg border border-border bg-secondary/30 p-3.5 flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          This is a read-only admin view. A server action verifies the signed-in admin through the database before using the server-only service role to read cross-user activity.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>
          Page {page + 1} of {totalPages} · {count} records
        </span>
        <button
          disabled={page === 0}
          onClick={() => {
            const p = page - 1;
            setPage(p);
            load(p);
          }}
          className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => {
            const p = page + 1;
            setPage(p);
            load(p);
          }}
          className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyTitle="No watch activity"
        emptyDescription="Playback records will appear here when users watch movies or TV episodes."
      />
    </div>
  );
}
