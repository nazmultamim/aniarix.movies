"use client";

import { useEffect, useState } from "react";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import { getAdminUsers, updateAdminUserRole } from "@/lib/action/admin.actions";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(searchTerm = "") {
    setLoading(true);
    setError("");
    try {
      const result = await getAdminUsers({ search: searchTerm });
      if (result.error) throw new Error(result.error);
      setUsers(result.users);
    } catch {
      setError("Unable to load user accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleToggleRole(user) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setUpdatingId(user.id);
    setError("");
    setMessage("");
    try {
      const result = await updateAdminUserRole(user.id, nextRole);
      if (result.error) throw new Error(result.error);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
      );
      setMessage(`Updated ${user.username || "user"} to ${nextRole}.`);
    } catch {
      setError("Role update was rejected or could not be saved.");
    } finally {
      setUpdatingId(null);
    }
  }

  const columns = [
    {
      key: "username",
      header: "User",
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
          <div>
            <p className="font-medium">{row.username || "—"}</p>
            <p className="text-xs text-muted-foreground">{row.full_name || "No name set"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <Badge variant={row.role} />,
    },
    {
      key: "created_at",
      header: "Joined",
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <button
          onClick={() => handleToggleRole(row)}
          disabled={updatingId === row.id || row.is_current_user}
          title={row.is_current_user ? "You cannot change your own role here." : undefined}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50
          ${
            row.role === "admin"
              ? "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              : "border-primary-border/30 text-primary hover:bg-primary/10"
          }`}
        >
          {row.role === "admin" ? (
            <>
              <ShieldOff className="w-3.5 h-3.5" /> Revoke admin
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" /> Make admin
            </>
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
            placeholder="Search by username…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-secondary border border-border
            text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground">{users.length} users</span>
      </div>
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">{message}</p>}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyTitle="No users found"
        emptyDescription="Try a different search term."
      />
    </div>
  );
}
