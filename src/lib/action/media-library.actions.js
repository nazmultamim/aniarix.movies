'use server';

import { createClient } from '@/lib/supabase/server';

const MEDIA_TYPES = new Set(['movie', 'tv']);
const LIST_TYPES = new Set(['favorite', 'watchlist']);
const LIST_COLUMNS = 'id, user_id, tmdb_id, media_type, list_type, created_at';
const RATING_COLUMNS = 'id, user_id, tmdb_id, media_type, rating, review, created_at, updated_at';
const MAX_INT32 = 2_147_483_647;

function normalizeIdentity(mediaType, tmdbId) {
  const id = Number(tmdbId);
  if (!MEDIA_TYPES.has(mediaType) || !Number.isSafeInteger(id) || id <= 0 || id > MAX_INT32) return null;
  return id;
}

async function getUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

export async function getUserMediaList(listType) {
  if (!LIST_TYPES.has(listType)) return { entries: [], error: 'Invalid list type.' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { entries: [], error: 'Not authenticated.' };
  const { data, error } = await supabase.from('user_media_list').select(LIST_COLUMNS)
    .eq('user_id', user.id).eq('list_type', listType).order('created_at', { ascending: false });
  return error ? { entries: [], error: error.message } : { entries: data ?? [] };
}

export async function addMediaToList({ mediaType, tmdbId, listType }) {
  const id = normalizeIdentity(mediaType, tmdbId);
  if (!id || !LIST_TYPES.has(listType)) return { error: 'Valid media type, TMDB ID, and list type are required.' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'Not authenticated.' };
  const payload = { user_id: user.id, tmdb_id: id, media_type: mediaType, list_type: listType };
  const { data, error } = await supabase.from('user_media_list').insert(payload).select(LIST_COLUMNS).single();
  if (error?.code === '23505') return { success: true, alreadySaved: true };
  return error ? { error: error.message } : { entry: data, success: true };
}

export async function removeMediaFromList({ mediaType, tmdbId, listType }) {
  const id = normalizeIdentity(mediaType, tmdbId);
  if (!id || !LIST_TYPES.has(listType)) return { error: 'Valid media type, TMDB ID, and list type are required.' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'Not authenticated.' };
  const { error } = await supabase.from('user_media_list').delete()
    .eq('user_id', user.id).eq('tmdb_id', id).eq('media_type', mediaType).eq('list_type', listType);
  return error ? { error: error.message } : { success: true };
}

export async function getUserMediaRatings() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { entries: [], error: 'Not authenticated.' };
  const { data, error } = await supabase.from('user_media_ratings').select(RATING_COLUMNS)
    .eq('user_id', user.id).order('updated_at', { ascending: false });
  return error ? { entries: [], error: error.message } : { entries: data ?? [] };
}

export async function saveUserMediaRating({ mediaType, tmdbId, rating, review = null }) {
  const id = normalizeIdentity(mediaType, tmdbId);
  const score = Number(rating);
  if (!id || !Number.isFinite(score) || score < 1 || score > 10 || Math.round(score * 2) !== score * 2) {
    return { error: 'Rating must be between 1 and 10 in half-point steps.' };
  }
  if (review != null && (typeof review !== 'string' || review.length > 5000)) return { error: 'Review must be 5000 characters or fewer.' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'Not authenticated.' };
  const payload = { user_id: user.id, tmdb_id: id, media_type: mediaType, rating: score, review: review?.trim() || null };
  const { data, error } = await supabase.from('user_media_ratings').upsert(payload, {
    onConflict: 'user_id,media_type,tmdb_id',
  }).select(RATING_COLUMNS).single();
  return error ? { error: error.message } : { entry: data, success: true };
}

export async function deleteUserMediaRating({ mediaType, tmdbId }) {
  const id = normalizeIdentity(mediaType, tmdbId);
  if (!id) return { error: 'Valid media type and TMDB ID are required.' };
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { error: 'Not authenticated.' };
  const { error } = await supabase.from('user_media_ratings').delete()
    .eq('user_id', user.id).eq('tmdb_id', id).eq('media_type', mediaType);
  return error ? { error: error.message } : { success: true };
}
