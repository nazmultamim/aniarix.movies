'use client';

import { upsertWatchProgress } from '@/lib/action/watch.actions';

let lastSaveAt = 0;
let lastSyncedTime = 0;

// Sync to DB roughly every 60 seconds during playback — both conditions
// must hold, not just one, or this collapses to a ~15s throttle instead
// of a ~60s one (see the fix note below).
const SYNC_INTERVAL_MS = 60000;
// Minimum progress change (in seconds) to bother syncing — avoids a
// write when the player is paused/stalled at the same position.
const MIN_PROGRESS_DELTA = 15;

// Call after an episode/language/server switch so the NEW context's
// next progress event isn't held back by the previous context's timer.
export function resetThrottle() {
  lastSaveAt = 0;
  lastSyncedTime = 0;
}

/**
 * Smart throttled save — only hits the DB when BOTH:
 * 1. 60+ seconds since last sync, AND
 * 2. Progress moved by 15+ seconds
 * (Completion always saves immediately, handled separately below.)
 *
 * During playback, localStorage handles the real-time tracking.
 * Supabase is just the periodic backup + cross-device sync.
 */
export async function saveProgressThrottled({
  anilistId = null,
  malId = null,
  title,
  poster,
  episode,
  language,
  currentTimeSeconds,
  durationSeconds,
  server,
  completed = false,
  status = 'watching',
}) {
  // Always save immediately on completion
  if (completed) {
    return saveProgressNow({
      anilistId, malId, title, poster, episode, language,
      currentTimeSeconds, durationSeconds, server,
      completed: true, status: 'completed',
    });
  }

  const now = Date.now();
  const timeSinceLastSave = now - lastSaveAt;
  const progressDelta = Math.abs(currentTimeSeconds - lastSyncedTime);

  // Skip unless BOTH enough time has passed AND enough progress was made.
  // (Using || here, not && — that's the fix: either condition alone being
  // false is reason enough to skip.)
  if (timeSinceLastSave < SYNC_INTERVAL_MS || progressDelta < MIN_PROGRESS_DELTA) {
    return;
  }

  lastSaveAt = now;
  lastSyncedTime = currentTimeSeconds;
  try {
    await upsertWatchProgress({
      anilistId, malId, title, poster, episode, language,
      currentTimeSeconds, durationSeconds, server,
      completed, status,
    });
  } catch (err) {
    console.error('[watchHistory] Throttled save failed:', err);
  }
}

/**
 * Force save — bypasses all throttling.
 * Use on: episode switch, language switch, server switch, completion, unmount.
 */
export async function saveProgressNow({
  anilistId = null,
  malId = null,
  title,
  poster,
  episode,
  language,
  currentTimeSeconds,
  durationSeconds,
  server,
  completed = false,
  status = 'watching',
}) {
  lastSaveAt = Date.now();
  lastSyncedTime = currentTimeSeconds;
  try {
    await upsertWatchProgress({
      anilistId, malId, title, poster, episode, language,
      currentTimeSeconds, durationSeconds, server,
      completed, status: completed ? 'completed' : status,
    });
  } catch (err) {
    console.error('[watchHistory] Force save failed:', err);
  }
}
