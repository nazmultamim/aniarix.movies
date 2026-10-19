import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * A provider is usable only after its integration has an explicit application
 * adapter. Keep this registry empty until a provider is authorized and tested;
 * admin-entered URLs alone never become playback URLs.
 *
 * Adapter contract: { key, kind: 'native'|'iframe', buildUrl({ baseUrl, tmdbId, mediaType, seasonNumber,
 * episodeNumber }) }. `buildUrl` must validate its base origin and output URL.
 * @type {Readonly<Record<string, { key: string, buildUrl: Function }>>}
 */
const TRUSTED_ADAPTERS = Object.freeze({});

/** @typedef {{ id: string, name: string, key: string, url: string }} PlaybackProvider */

function validProviderUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
      ? url
      : null;
  } catch {
    return null;
  }
}

/** Read enabled rows through the request-scoped, RLS-bound client. */
export async function getPlaybackProviders({ mediaType, tmdbId, seasonNumber = null, episodeNumber = null }) {
  if (!['movie', 'tv'].includes(mediaType) || !Number.isSafeInteger(Number(tmdbId)) || Number(tmdbId) <= 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('player_providers')
    .select('id,name,provider_key,base_url,enabled,priority')
    .eq('enabled', true)
    .order('priority', { ascending: false });

  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const adapter = TRUSTED_ADAPTERS[row.provider_key];
    const base = validProviderUrl(row.base_url);
    if (!row.enabled || !adapter || !base) return [];
    try {
      const url = adapter.buildUrl({
        baseUrl: base,
        tmdbId: Number(tmdbId),
        mediaType,
        seasonNumber,
        episodeNumber,
      });
      if (!(url instanceof URL) || url.protocol !== 'https:' || url.origin !== base.origin || url.username || url.password) return [];
      if (!['native', 'iframe'].includes(adapter.kind)) return [];
      return [{ id: row.id, name: row.name, key: adapter.key, kind: adapter.kind, url: url.toString() }];
    } catch {
      return [];
    }
  });
}
