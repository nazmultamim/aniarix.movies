'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, Trash2, Pencil, X } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/admin/Badge';
import { deleteAdminProvider, getAdminProviders, saveAdminProvider } from '@/lib/action/admin.actions';

const EMPTY_FORM = { id: null, name: '', providerKey: '', baseUrl: '', clearBaseUrl: false, hasBaseUrl: false, enabled: false, priority: 0 };

export default function AdminProviderPage() {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminProviders();
      setProviders(result.providers ?? []);
      setError(result.error || '');
    } catch {
      setError('Unable to load configured providers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function editProvider(provider) {
    setForm({ id: provider.id, name: provider.name, providerKey: provider.provider_key, baseUrl: '', clearBaseUrl: false, hasBaseUrl: provider.has_base_url, enabled: provider.enabled, priority: provider.priority });
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await saveAdminProvider(form);
      if (result.error) setError(result.error);
      else {
        setForm(EMPTY_FORM);
        setMessage('Provider saved.');
        await load();
      }
    } catch {
      setError('Unable to save this provider.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(provider) {
    if (!window.confirm(`Delete provider “${provider.name}”?`)) return;
    setError('');
    setMessage('');
    try {
      const result = await deleteAdminProvider(provider.id);
      if (result.error) setError(result.error);
      else { setMessage('Provider deleted.'); await load(); }
    } catch {
      setError('Unable to delete this provider.');
    }
  }

  const columns = [
    { key: 'name', header: 'Provider', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.provider_key}</p></div> },
    { key: 'base_url', header: 'Base URL', render: (row) => <span className="text-xs text-muted-foreground">{row.has_base_url ? 'Configured · hidden' : 'Not configured'}</span> },
    { key: 'priority', header: 'Priority' },
    { key: 'enabled', header: 'Status', render: (row) => <Badge variant={row.enabled ? 'completed' : 'dropped'}>{row.enabled ? 'Enabled' : 'Disabled'}</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: (row) => <div className="flex justify-end gap-2"><button type="button" onClick={() => editProvider(row)} aria-label={`Edit ${row.name}`} className="rounded-md border border-border p-2 hover:bg-secondary"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => remove(row)} aria-label={`Delete ${row.name}`} className="rounded-md border border-border p-2 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div> },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="font-semibold text-foreground">{form.id ? 'Edit provider' : 'Add provider'}</h2><p className="mt-1 text-xs text-muted-foreground">Provider URLs remain server-side and are never returned to this page. URL path mapping stays in application code; a configured row alone does not mean playback is supported.</p></div>
          {form.id && <button type="button" onClick={() => setForm(EMPTY_FORM)} className="rounded-md p-2 text-muted-foreground hover:bg-secondary" aria-label="Cancel edit"><X className="h-4 w-4" /></button>}
        </div>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs text-muted-foreground">Name<input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="text-xs text-muted-foreground">Provider key<input required minLength={2} maxLength={40} pattern="[a-z0-9_-]+" value={form.providerKey} onChange={(e) => setForm({ ...form, providerKey: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">HTTPS base URL<input type="url" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value, clearBaseUrl: false })} placeholder={form.hasBaseUrl ? 'Stored URL exists; leave blank to keep it' : 'https://provider.example'} autoComplete="off" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="text-xs text-muted-foreground">Priority<input type="number" step="1" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Enabled</label>
          {form.id && form.hasBaseUrl && <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={form.clearBaseUrl} onChange={(e) => setForm({ ...form, clearBaseUrl: e.target.checked, enabled: e.target.checked ? false : form.enabled })} /> Remove stored URL</label>}
          <div className="flex items-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{form.id ? 'Save changes' : 'Add provider'}</button></div>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
      </div>
      <DataTable columns={columns} data={providers} loading={loading} emptyTitle="No providers configured" emptyDescription="Add a provider using its HTTPS base URL. Provider paths and playback behavior are configured in application code." />
    </div>
  );
}
