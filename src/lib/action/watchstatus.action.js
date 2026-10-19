'use server';

import { createClient } from '@/lib/supabase/server';
import { WATCH_STATUS_VALUES } from '@/lib/watchStatus';

const MAX_INT32 = 2_147_483_647;

export async function updateWatchStatus({
  mediaType,
  tmdbId,
  seasonNumber = null,
  episodeNumber = null,
  title = null,
  poster = null,
  status,
}) {
  const id = Number(tmdbId);
  seasonNumber = seasonNumber == null ? null : Number(seasonNumber);
  episodeNumber = episodeNumber == null ? null : Number(episodeNumber);
  if (!Number.isSafeInteger(id) || id <= 0 || id > MAX_INT32) return { error: 'A valid TMDB ID is required.' };
  if (!['movie', 'tv'].includes(mediaType)) return { error: 'Media type must be movie or tv.' };
  if (!WATCH_STATUS_VALUES.includes(status)) return { error: 'Invalid watch status.' };
  if (mediaType === 'movie' && (seasonNumber != null || episodeNumber != null)) return { error: 'Movies cannot have a season or episode number.' };
  if (mediaType === 'tv' && ((seasonNumber == null) !== (episodeNumber == null))) return { error: 'TV status requires both season and episode numbers, or neither for series status.' };
  for (const [label, value] of [['Season', seasonNumber], ['Episode', episodeNumber]]) {
    if (value != null && (!Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > MAX_INT32)) return { error: `${label} number must be a non-negative integer.` };
  }
  for (const [label, value, max] of [['Title', title, 500], ['Poster URL', poster, 2048]]) {
    if (value != null && (typeof value !== 'string' || value.length > max)) return { error: `${label} must be ${max} characters or fewer.` };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const { data, error } = await supabase.rpc('set_watch_status', {
    p_media_type: mediaType,
    p_tmdb_id: id,
    p_status: status,
    p_season_number: seasonNumber,
    p_episode_number: episodeNumber,
    p_title: title,
    p_poster: poster,
  });
  return error ? { error: error.message } : { entry: data };
}
