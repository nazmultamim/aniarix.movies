'use server';

import { createClient } from '@/lib/supabase/server';

const WATCH_HISTORY_COLUMNS = 'id, user_id, tmdb_id, media_type, title, poster, season_number, episode_number, language, current_time_seconds, duration_seconds, progress_percent, completed, server, status, last_watched_at, created_at, updated_at';
const MEDIA_TYPES = new Set(['movie', 'tv']);
const MAX_INT32 = 2_147_483_647;

function normalizeId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= MAX_INT32 ? id : null;
}

function normalizeCoordinates(seasonNumber, episodeNumber) {
  const season = seasonNumber == null ? null : Number(seasonNumber);
  const episode = episodeNumber == null ? null : Number(episodeNumber);
  if ((season !== null && (!Number.isSafeInteger(season) || season < 0 || season > MAX_INT32)) || (episode !== null && (!Number.isSafeInteger(episode) || episode < 0 || episode > MAX_INT32))) return null;
  if ((season === null) !== (episode === null)) return null;
  return { season, episode };
}

async function getCurrentUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

export async function getWatchHistory(limit = 20) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return { entries: [], error: 'Not authenticated.' };
  const safeLimit = Math.min(100, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 20));
  const { data, error } = await supabase
    .from('watch_history')
    .select(WATCH_HISTORY_COLUMNS)
    .eq('user_id', user.id)
    .order('last_watched_at', { ascending: false })
    .limit(safeLimit);
  return error ? { entries: [], error: error.message } : { entries: data ?? [] };
}

export async function getContinueWatching(limit = 20) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return { entries: [], error: 'Not authenticated.' };
  const safeLimit = Math.min(100, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 20));
  const { data, error } = await supabase.rpc('continue_watching', { p_limit: safeLimit });
  if (error) return { entries: [], error: error.message };
  return { entries: Array.isArray(data) ? data : data ? [data] : [] };
}

export async function getWatchProgress({ mediaType, tmdbId, seasonNumber = null, episodeNumber = null }) {
  const id = normalizeId(tmdbId);
  const coordinates = normalizeCoordinates(seasonNumber, episodeNumber);
  if (!id || !MEDIA_TYPES.has(mediaType) || !coordinates) return { entry: null, error: 'Invalid media identity.' };
  if (mediaType === 'movie' && (coordinates.season !== null || coordinates.episode !== null)) return { entry: null, error: 'Movies cannot have episode coordinates.' };

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return { entry: null, error: 'Not authenticated.' };
  let query = supabase.from('watch_history').select(WATCH_HISTORY_COLUMNS)
    .eq('user_id', user.id)
    .eq('media_type', mediaType)
    .eq('tmdb_id', id);
  query = coordinates.season === null
    ? query.is('season_number', null).is('episode_number', null)
    : query.eq('season_number', coordinates.season).eq('episode_number', coordinates.episode);
  const { data, error } = await query.maybeSingle();
  return error ? { entry: null, error: error.message } : { entry: data ?? null };
}

export async function deleteWatchHistoryEntry(id) {
  if (typeof id !== 'string' || !id.trim()) return { error: 'A watch-history row ID is required.' };
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'Not authenticated.' };
  const { error } = await supabase.from('watch_history').delete().eq('id', id).eq('user_id', user.id);
  return error ? { error: error.message } : { success: true };
}
