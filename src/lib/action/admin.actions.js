'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canChangeAdminTargetRole, isAdminProfile } from '@/lib/security/admin-access.mjs';

const PROVIDER_PUBLIC_COLUMNS = 'id, name, provider_key, enabled, priority, created_at, updated_at';
const PROVIDER_SERVER_COLUMNS = 'id, name, provider_key, base_url, enabled, priority, created_at, updated_at';
const USER_COLUMNS = 'id, username, full_name, avatar_url, role, created_at';
const HISTORY_COLUMNS = 'id, user_id, tmdb_id, media_type, title, poster, season_number, episode_number, language, current_time_seconds, duration_seconds, progress_percent, completed, server, status, last_watched_at';
const EDITABLE_SETTINGS = Object.freeze({
  site: ['name', 'description', 'logo_url', 'default_language'],
  media_sections: ['movies', 'tv'],
  features: ['watch_progress', 'watchlist', 'favorites', 'ratings'],
  maintenance: ['enabled'],
  playback_defaults: ['language', 'autoplay'],
});

async function getAdminContext() {
  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };
  const { data, error } = await sessionClient.rpc('get_my_profile');
  const profile = Array.isArray(data) ? data[0] : data;
  if (error || !isAdminProfile(profile, user.id)) return { error: 'Admin access required.' };

  // Privileged access is created only after this request's authenticated
  // profile has been verified by the database RPC. Never expose this client.
  return { user, supabase: sessionClient, admin: createAdminClient() };
}

function redactAuditValue(value, key = '') {
  if (/secret|token|password|authorization|api.?key|base.?url/i.test(key)) return '[redacted]';
  if (Array.isArray(value)) return value.map((item) => redactAuditValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactAuditValue(childValue, childKey)]));
  }
  return value;
}

function visibleSettingValue(key, value) {
  if (!EDITABLE_SETTINGS[key] || !value || typeof value !== 'object' || Array.isArray(value)) return {};
  const visible = {};
  for (const field of EDITABLE_SETTINGS[key]) {
    if (!Object.hasOwn(value, field)) continue;
    const safeValue = validateSettingPatch(key, { [field]: value[field] });
    if (safeValue) Object.assign(visible, safeValue);
  }
  return visible;
}

function normalizePage(page, pageSize) {
  const safePage = Number.isSafeInteger(Number(page)) ? Math.max(0, Number(page)) : 0;
  const safeSize = Number.isSafeInteger(Number(pageSize)) ? Math.min(100, Math.max(1, Number(pageSize))) : 10;
  return { safePage, safeSize, from: safePage * safeSize, to: safePage * safeSize + safeSize - 1 };
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getAdminDashboardData() {
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  const { admin } = context;
  const [users, providers, history, recent] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('player_providers').select('id', { count: 'exact', head: true }),
    admin.from('watch_history').select('id', { count: 'exact', head: true }),
    admin.from('watch_history').select(HISTORY_COLUMNS).order('last_watched_at', { ascending: false }).limit(8),
  ]);
  const queryError = users.error || providers.error || history.error || recent.error;
  if (queryError) return { error: queryError.message };
  return {
    stats: { userCount: users.count ?? 0, providerCount: providers.count ?? 0, watchCount: history.count ?? 0 },
    activity: recent.data ?? [],
  };
}

export async function getAdminUsers({ search = '' } = {}) {
  const context = await getAdminContext();
  if (context.error) return { error: context.error, users: [] };
  let query = context.admin.from('profiles').select(USER_COLUMNS).order('created_at', { ascending: false });
  const term = typeof search === 'string' ? search.trim().slice(0, 80) : '';
  if (term) query = query.ilike('username', `%${term}%`);
  const { data, error } = await query;
  return error ? { error: error.message, users: [] } : { users: (data ?? []).map((profile) => ({ ...profile, is_current_user: profile.id === context.user.id })) };
}

export async function updateAdminUserRole(userId, role) {
  if (!isUuid(userId) || !['user', 'admin'].includes(role)) {
    return { error: 'Invalid user or role.' };
  }
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  if (!canChangeAdminTargetRole({ id: context.user.id, role: 'admin' }, context.user.id, userId)) return { error: 'You cannot change your own admin role here.' };
  const { data, error } = await context.admin.from('profiles').update({ role }).eq('id', userId).select('id').maybeSingle();
  return error ? { error: error.message } : data ? { success: true } : { error: 'User profile was not found.' };
}

export async function getAdminWatchHistory({ page = 0, pageSize = 10 } = {}) {
  const context = await getAdminContext();
  if (context.error) return { error: context.error, data: [], count: 0 };
  const range = normalizePage(page, pageSize);
  const { data, error, count } = await context.admin.from('watch_history').select(HISTORY_COLUMNS, { count: 'exact' })
    .order('last_watched_at', { ascending: false }).range(range.from, range.to);
  return error ? { error: error.message, data: [], count: 0 } : { data: data ?? [], count: count ?? 0 };
}

export async function getAdminAuditLogs({ page = 0, pageSize = 20 } = {}) {
  const context = await getAdminContext();
  if (context.error) return { error: context.error, data: [], count: 0 };
  const range = normalizePage(page, pageSize);
  const { data, error, count } = await context.supabase.from('admin_audit_logs')
    .select('id, admin_user_id, action, target_type, target_id, details, created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).range(range.from, range.to);
  return error ? { error: error.message, data: [], count: 0 } : {
    data: (data ?? []).map((row) => ({ ...row, details: redactAuditValue(row.details) })),
    count: count ?? 0,
  };
}

export async function getAdminSettings() {
  const context = await getAdminContext();
  if (context.error) return { error: context.error, settings: [] };
  const keys = Object.keys(EDITABLE_SETTINGS);
  const { data, error } = await context.supabase.from('app_settings')
    .select('key,value,updated_at').in('key', keys).order('key');
  return error ? { error: error.message, settings: [] } : {
    settings: (data ?? []).map((item) => ({ ...item, value: visibleSettingValue(item.key, item.value) })),
  };
}

function validateSettingPatch(key, value) {
  const allowed = EDITABLE_SETTINGS[key];
  if (!allowed || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([field]) => !allowed.includes(field))) return null;
  const patch = {};
  for (const [field, item] of entries) {
    if (['movies', 'tv', 'watch_progress', 'watchlist', 'favorites', 'ratings', 'enabled', 'autoplay'].includes(field)) {
      if (typeof item !== 'boolean') return null;
      patch[field] = item;
    } else if (field === 'logo_url') {
      if (item !== null) {
        try {
          const logoUrl = new URL(item);
          if (typeof item !== 'string' || item.length > 2048 || logoUrl.protocol !== 'https:' || logoUrl.username || logoUrl.password || logoUrl.search || logoUrl.hash) return null;
        }
        catch { return null; }
      }
      patch[field] = item;
    } else if (field === 'name') {
      if (typeof item !== 'string' || !item.trim() || item.length > 80) return null;
      patch[field] = item.trim();
    } else if (field === 'description') {
      if (typeof item !== 'string' || item.length > 500) return null;
      patch[field] = item.trim();
    } else if (field === 'language' || field === 'default_language') {
      if (typeof item !== 'string' || !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(item)) return null;
      patch[field] = item;
    }
  }
  return Object.keys(patch).length === entries.length ? patch : null;
}

/** Update an existing, explicitly allowlisted setting using the admin's session so auth.uid() is preserved. */
export async function saveAdminSetting(key, patchValue) {
  const patch = validateSettingPatch(key, patchValue);
  if (!patch) return { error: 'This setting or value is not supported.' };
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  const { data: current, error: readError } = await context.supabase.from('app_settings')
    .select('value').eq('key', key).maybeSingle();
  if (readError) return { error: readError.message };
  if (!current || !current.value || typeof current.value !== 'object' || Array.isArray(current.value)) return { error: 'The existing setting is unavailable.' };
  const { data, error } = await context.supabase.from('app_settings')
    .update({ value: { ...current.value, ...patch } }).eq('key', key)
    .select('key,value,updated_at').single();
  return error ? { error: error.message } : { setting: { ...data, value: visibleSettingValue(data.key, data.value) }, success: true };
}

export async function getAdminProviders() {
  const context = await getAdminContext();
  if (context.error) return { error: context.error, providers: [] };
  const { data, error } = await context.supabase.from('player_providers').select(PROVIDER_SERVER_COLUMNS)
    .order('priority', { ascending: false }).order('name');
  return error ? { error: error.message, providers: [] } : {
    providers: (data ?? []).map(({ base_url, ...provider }) => ({ ...provider, has_base_url: Boolean(base_url) })),
  };
}

export async function saveAdminProvider({ id = null, name, providerKey, baseUrl = null, clearBaseUrl = false, enabled = false, priority = 0 }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const key = typeof providerKey === 'string' ? providerKey.trim() : '';
  const url = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : null;
  const order = Number(priority);
  if (cleanName.length < 1 || cleanName.length > 80) return { error: 'Provider name must be 1–80 characters.' };
  if (!/^[a-z0-9_-]{2,40}$/.test(key)) return { error: 'Provider key must be 2–40 lowercase letters, numbers, underscores, or hyphens.' };
  if (!Number.isSafeInteger(order) || order < -2_147_483_648 || order > 2_147_483_647) return { error: 'Priority must be a 32-bit integer.' };
  if (typeof enabled !== 'boolean' || typeof clearBaseUrl !== 'boolean') return { error: 'Provider flags must be boolean values.' };
  if (url) {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash || url.length > 2048 || /[\s<>\"]/.test(url)) return { error: 'Provider URL must be an HTTPS URL without credentials, query parameters, or fragments.' };
    }
    catch { return { error: 'Provider URL must be a valid HTTPS URL.' }; }
  }
  if (clearBaseUrl !== true && baseUrl != null && typeof baseUrl !== 'string') return { error: 'Provider URL must be text.' };
  if (id != null && !isUuid(id)) return { error: 'Invalid provider ID.' };
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  let storedUrl = clearBaseUrl ? null : url;
  if (id && !clearBaseUrl && !url) {
    const { data: existing, error: readError } = await context.supabase.from('player_providers').select('base_url').eq('id', id).maybeSingle();
    if (readError) return { error: readError.message };
    if (!existing) return { error: 'Provider not found.' };
    storedUrl = existing.base_url;
  }
  if (enabled && !storedUrl) return { error: 'An enabled provider needs an HTTPS base URL.' };
  const payload = { name: cleanName, provider_key: key, base_url: storedUrl, enabled: enabled === true, priority: order };
  const query = id
    ? context.supabase.from('player_providers').update(payload).eq('id', id)
    : context.supabase.from('player_providers').insert(payload);
  const { data, error } = await query.select(PROVIDER_PUBLIC_COLUMNS).maybeSingle();
  return error ? { error: error.message } : { provider: data, success: true };
}

export async function deleteAdminProvider(id) {
  if (!isUuid(id)) return { error: 'Invalid provider ID.' };
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  const { error } = await context.supabase.from('player_providers').delete().eq('id', id);
  return error ? { error: error.message } : { success: true };
}
