'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { getAdminAuditLogs } from '@/lib/action/admin.actions';

const PAGE_SIZE = 20;

export default function AdminAuditPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextPage) {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminAuditLogs({ page: nextPage, pageSize: PAGE_SIZE });
      if (result.error) throw new Error(result.error);
      setRows(result.data || []);
      setCount(result.count || 0);
      setPage(nextPage);
    } catch {
      setError('Unable to load administrative audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const timer = setTimeout(() => load(0), 0); return () => clearTimeout(timer); }, []);

  const columns = [
    { key: 'created_at', header: 'When', render: (row) => new Date(row.created_at).toLocaleString() },
    { key: 'action', header: 'Action', render: (row) => <span className="font-medium">{row.action}</span> },
    { key: 'target_type', header: 'Target', render: (row) => <span>{row.target_type || '—'}{row.target_id ? <small className="ml-2 text-muted-foreground">{row.target_id}</small> : null}</span> },
    { key: 'admin_user_id', header: 'Admin', render: (row) => row.admin_user_id ? <code className="text-xs text-muted-foreground">{row.admin_user_id.slice(0, 8)}…</code> : <span className="text-xs text-muted-foreground">Actor not recorded</span> },
    { key: 'details', header: 'Details', render: (row) => <pre className="max-w-[420px] whitespace-pre-wrap break-all text-xs text-muted-foreground">{JSON.stringify(row.details)}</pre> },
  ];
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return <div className="space-y-4">
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"><ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Read-only audit records from the existing admin_audit_logs table. Sensitive-looking detail fields are redacted by the server.</p></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground"><span>Page {page + 1} of {pageCount} · {count} records</span><button type="button" aria-label="Previous page" disabled={page === 0 || loading} onClick={() => load(page - 1)} className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Next page" disabled={page + 1 >= pageCount || loading} onClick={() => load(page + 1)} className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
    <DataTable columns={columns} data={rows} loading={loading} emptyTitle="No audit logs" emptyDescription="Administrative changes recorded by database triggers will appear here." />
  </div>;
}
