'use server';

import { createClient } from '@/lib/supabase/server';

const MEDIA_TYPES = new Set(['movie', 'tv']);
const MAX_INT32 = 2_147_483_647;

function normalizeId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= MAX_INT32 ? id : null;
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= MAX_INT32 ? number : NaN;
}

function validateShape(mediaType, seasonNumber, episodeNumber) {
  if (!MEDIA_TYPES.has(mediaType)) return 'Media type must be movie or tv.';
  if (mediaType === 'movie' && (seasonNumber !== null || episodeNumber !== null)) {
    return 'Movies cannot have a season or episode number.';
  }
  if (mediaType === 'tv' && ((seasonNumber === null) !== (episodeNumber === null))) {
    return 'TV progress requires both season and episode numbers, or neither for series status.';
  }
  return null;
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null, error: 'Not authenticated.' };
  return { supabase, user, error: null };
}

/** Records progress through the existing auth.uid()-scoped RPC. */
export async function upsertWatchProgress({
  mediaType,
  tmdbId,
  seasonNumber = null,
  episodeNumber = null,
  title = null,
  poster = null,
  language = 'en',
  currentTimeSeconds = 0,
  durationSeconds = 0,
  server = null,
  eventAt = new Date().toISOString(),
  markCompleted = false,
}) {
  const safeTmdbId = normalizeId(tmdbId);
  const season = normalizeOptionalNumber(seasonNumber);
  const episode = normalizeOptionalNumber(episodeNumber);
  if (!safeTmdbId) return { error: 'A valid TMDB ID is required.' };
  if (Number.isNaN(season) || Number.isNaN(episode)) return { error: 'Season and episode numbers must be non-negative integers.' };
  const shapeError = validateShape(mediaType, season, episode);
  if (shapeError) return { error: shapeError };

  const current = Number(currentTimeSeconds);
  const duration = Number(durationSeconds);
  if (!Number.isSafeInteger(current) || current < 0 || current > MAX_INT32 || !Number.isSafeInteger(duration) || duration < 0 || duration > MAX_INT32) {
    return { error: 'Playback time values must be non-negative integers.' };
  }
  if (mediaType === 'tv' && season === null && (current > 0 || duration > 0)) {
    return { error: 'Series-level rows can store status only, not playback progress.' };
  }
  if (typeof language !== 'string' || language.length < 1 || language.length > 16) {
    return { error: 'Language must be between 1 and 16 characters.' };
  }
  if (title != null && (typeof title !== 'string' || title.length > 500)) return { error: 'Title must be 500 characters or fewer.' };
  if (poster != null && (typeof poster !== 'string' || poster.length > 2048)) return { error: 'Poster URL must be 2048 characters or fewer.' };
  if (server != null && (typeof server !== 'string' || server.length > 64)) return { error: 'Server must be 64 characters or fewer.' };
  const eventDate = new Date(eventAt);
  if (Number.isNaN(eventDate.getTime())) return { error: 'Invalid playback event time.' };

  const { supabase, error: authError } = await getAuthenticatedClient();
  if (authError) return { error: authError };

  const { data, error } = await supabase.rpc('upsert_watch_progress', {
    p_media_type: mediaType,
    p_tmdb_id: safeTmdbId,
    p_season_number: season,
    p_episode_number: episode,
    p_current_time_seconds: current,
    p_duration_seconds: duration,
    p_title: title,
    p_poster: poster,
    p_language: language,
    p_server: server,
    p_event_at: eventDate.toISOString(),
    p_mark_completed: markCompleted === true,
  });

  return error ? { error: error.message } : { entry: data };
}
