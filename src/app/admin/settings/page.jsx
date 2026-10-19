'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Settings2 } from 'lucide-react';
import { getAdminSettings, saveAdminSetting } from '@/lib/action/admin.actions';

const EDITABLE_KEYS = ['site', 'media_sections', 'features', 'maintenance', 'playback_defaults'];
const FEATURE_FIELDS = [
  ['watch_progress', 'Watch progress'],
  ['watchlist', 'Watchlist'],
  ['favorites', 'Favorites'],
  ['ratings', 'Ratings and reviews'],
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminSettings();
      if (result.error) throw new Error(result.error);
      setSettings(Object.fromEntries((result.settings || []).map((item) => [item.key, item.value])));
    } catch {
      setError('Unable to load the supported application settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, []);

  function change(key, field, value) {
    setSettings((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
    setMessage('');
  }

  async function save(key) {
    setSaving(key);
    setError('');
    setMessage('');
    try {
      const result = await saveAdminSetting(key, settings[key]);
      if (result.error) throw new Error(result.error);
      setSettings((current) => ({ ...current, [key]: result.setting.value }));
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.message || 'Unable to save this setting.');
    } finally {
      setSaving('');
    }
  }

  function available(key) { return Boolean(settings[key] && typeof settings[key] === 'object'); }
  function saveButton(key) {
    return <button type="button" onClick={() => save(key)} disabled={saving !== '' || !available(key)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save</button>;
  }
  function booleanField(key, field, label) {
    return <label key={field} className="flex items-center justify-between gap-4 py-2 text-sm text-foreground"><span>{label}</span><input type="checkbox" checked={settings[key]?.[field] === true} disabled={loading || saving !== '' || !available(key)} onChange={(event) => change(key, field, event.target.checked)} className="h-4 w-4 accent-orange-500" /></label>;
  }

  return <div className="max-w-3xl space-y-5">
    <div><h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Settings2 className="h-5 w-5 text-primary" /> Application settings</h2><p className="mt-1 text-xs text-muted-foreground">Only existing, documented non-secret settings are editable here. Changes use your authenticated admin session.</p></div>
    {error && <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">{message}</p>}
    {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : <>
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">Site identity</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Site name<input value={settings.site?.name || ''} maxLength={80} onChange={(event) => change('site', 'name', event.target.value)} disabled={!available('site')} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50" /></label>
          <label className="text-xs text-muted-foreground">Default language<input value={settings.site?.default_language || ''} maxLength={6} onChange={(event) => change('site', 'default_language', event.target.value)} disabled={!available('site')} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50" /></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Description<textarea value={settings.site?.description || ''} maxLength={500} onChange={(event) => change('site', 'description', event.target.value)} disabled={!available('site')} rows={2} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50" /></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Logo URL (HTTPS)<input value={settings.site?.logo_url || ''} onChange={(event) => change('site', 'logo_url', event.target.value || null)} disabled={!available('site')} type="url" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50" /></label>
        </div>
        <div className="mt-4">{saveButton('site')}</div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">Media sections</h3>
        <div className="mt-3">{booleanField('media_sections', 'movies', 'Movies')}{booleanField('media_sections', 'tv', 'TV Shows')}</div>
        <div className="mt-3">{saveButton('media_sections')}</div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">Features</h3>
        <div className="mt-3">{FEATURE_FIELDS.map(([field, label]) => booleanField('features', field, label))}</div>
        <div className="mt-3">{saveButton('features')}</div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">Maintenance mode</h3>
        <div className="mt-3">{booleanField('maintenance', 'enabled', 'Enable maintenance mode')}</div>
        <div className="mt-3">{saveButton('maintenance')}</div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">Playback defaults</h3>
        <label className="mt-3 block max-w-xs text-xs text-muted-foreground">Language<input value={settings.playback_defaults?.language || ''} maxLength={6} onChange={(event) => change('playback_defaults', 'language', event.target.value)} disabled={!available('playback_defaults')} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50" /></label>
        <div className="mt-2">{booleanField('playback_defaults', 'autoplay', 'Autoplay')}</div>
        <div className="mt-3">{saveButton('playback_defaults')}</div>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">Catalog provider, homepage ordering, and cache TTL are not editable in this console because their runtime contracts are not wired here. No new settings keys are created.</p>
      <p className="text-xs leading-5 text-muted-foreground">Saving updates the existing settings rows. Some stored flags are not yet consumed by the public UI, so changing them may not change site behavior until that integration is added.</p>
    </>}
  </div>;
}
