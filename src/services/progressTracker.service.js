const STORAGE_KEY = 'anixWatchHistory';
const VIDNEST_ORIGIN = 'https://vidnest.fun';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeParse(value) {
  if (typeof value !== 'string') return value && typeof value === 'object' ? value : null;

  try {
    return JSON.parse(value);
  } catch (err) {
    console.error('[progressTracker] Failed to parse watch history payload:', err);
    return null;
  }
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/**
 * Unified progress schema — designed for future DB insertion.
 *
 * @typedef {Object} WatchProgressEntry
 * @property {string} anilistId
 * @property {number} episode
 * @property {string} serverId
 * @property {string} language
 * @property {number} currentTime
 * @property {number} duration
 * @property {number} percent
 * @property {string} status
 * @property {string} lastEvent
 * @property {number} updatedAt
 * @property {number} createdAt
 * @property {Object} raw
 */

function buildEntryKey(anilistId, episode) {
  return `${String(anilistId)}:${String(episode)}`;
}

function getAllProgress() {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('[progressTracker] Failed to read watch history:', err);
    return {};
  }
}

function saveAllProgress(data) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[progressTracker] Failed to save watch history:', err);
  }
}

function getProgressEntry(anilistId, episode) {
  const all = getAllProgress();
  return all[buildEntryKey(anilistId, episode)] || null;
}

function getResumeTime(anilistId, episode) {
  const entry = getProgressEntry(anilistId, episode);
  if (!entry || entry.status === 'completed') return 0;
  return Math.floor(entry.currentTime || 0);
}

function getAllEntriesForAnime(anilistId) {
  const all = getAllProgress();
  return Object.entries(all)
    .filter(([key]) => key.startsWith(`${String(anilistId)}:`))
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => Number(a.episode) - Number(b.episode));
}

function deleteProgressEntry(anilistId, episode) {
  const all = getAllProgress();
  delete all[buildEntryKey(anilistId, episode)];
  saveAllProgress(all);
}

function clearAllProgress() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function upsertProgress(normalizedEntry) {
  const all = getAllProgress();
  const key = buildEntryKey(normalizedEntry.anilistId, normalizedEntry.episode);
  const existing = all[key];

  all[key] = {
    ...existing,
    ...normalizedEntry,
    createdAt: existing?.createdAt || normalizedEntry.updatedAt,
    updatedAt: normalizedEntry.updatedAt,
  };

  saveAllProgress(all);
  return all[key];
}

function buildBaseEntry(context, eventName) {
  const now = Date.now();
  return {
    anilistId: String(context.anilistId),
    episode: Number(context.episode),
    serverId: context.serverId,
    language: context.language || 'sub',
    currentTime: 0,
    duration: 0,
    percent: 0,
    status: 'playing',
    lastEvent: eventName,
    updatedAt: now,
    raw: {},
  };
}

function normalizeMegaplayEvent(data, context) {
  const now = Date.now();

  if (data.event === 'time') {
    return {
      ...buildBaseEntry(context, 'time'),
      currentTime: normalizeNumber(data.time),
      duration: normalizeNumber(data.duration),
      percent: clampPercent(data.percent),
      status: 'playing',
      updatedAt: now,
      raw: data,
    };
  }

  if (data.type === 'watching-log') {
    const currentTime = normalizeNumber(data.currentTime);
    const duration = normalizeNumber(data.duration);
    return {
      ...buildBaseEntry(context, 'watching-log'),
      currentTime,
      duration,
      percent: duration > 0 ? clampPercent((currentTime / duration) * 100) : 0,
      status: 'playing',
      updatedAt: now,
      raw: data,
    };
  }

  if (data.event === 'complete') {
    return {
      ...buildBaseEntry(context, 'complete'),
      currentTime: normalizeNumber(data.currentTime),
      duration: normalizeNumber(data.duration),
      percent: 100,
      status: 'completed',
      updatedAt: now,
      raw: data,
    };
  }

  if (data.event === 'error') {
    return {
      ...buildBaseEntry(context, 'error'),
      status: 'error',
      updatedAt: now,
      raw: data,
    };
  }

  return null;
}

function normalizeVidnestPlayerEvent(data, context) {
  const now = Date.now();
  const playerData = data.data || {};
  const eventType = playerData.event || 'unknown';
  const currentTime = normalizeNumber(playerData.currentTime);
  const duration = normalizeNumber(playerData.duration);
  const percent = duration > 0 ? clampPercent((currentTime / duration) * 100) : 0;

  const statusByEvent = {
    play: 'playing',
    timeupdate: 'playing',
    pause: 'paused',
    seeked: 'playing',
    ended: 'completed',
  };

  return {
    ...buildBaseEntry(context, `PLAYER_EVENT:${eventType}`),
    currentTime,
    duration,
    percent: eventType === 'ended' ? 100 : percent,
    status: statusByEvent[eventType] || 'playing',
    updatedAt: now,
    raw: data,
  };
}

function normalizeVidnestMediaData(data, context) {
  const now = Date.now();
  const mediaData = data.data || {};
  const progress = mediaData.progress || {};
  const currentTime = normalizeNumber(progress.watched);
  const duration = normalizeNumber(progress.duration);
  const percent = duration > 0 ? clampPercent((currentTime / duration) * 100) : 0;

  return {
    ...buildBaseEntry(
      context,
      'MEDIA_DATA',
    ),
    episode: Number(mediaData.last_episode_watched || context.episode),
    currentTime,
    duration,
    percent,
    status: percent >= 100 ? 'completed' : 'playing',
    updatedAt: now,
    raw: data,
  };
}

function normalizeVidnestEvent(data, context) {
  if (data.type === 'PLAYER_EVENT') {
    return normalizeVidnestPlayerEvent(data, context);
  }

  if (data.type === 'MEDIA_DATA') {
    return normalizeVidnestMediaData(data, context);
  }

  return null;
}

function isMegaplayEvent(event, data) {
  return (
    event?.origin === 'https://megaplay.buzz' && (
      data?.channel === 'megacloud' ||
      data?.type === 'watching-log' ||
      data?.event === 'time' ||
      data?.event === 'complete' ||
      data?.event === 'error'
    )
  );
}

function isVidnestEvent(event, data) {
  return event?.origin === VIDNEST_ORIGIN && (data?.type === 'PLAYER_EVENT' || data?.type === 'MEDIA_DATA');
}

/**
 * Main postMessage handler.
 * Use from a React effect and pass the current playback context.
 */
function handlePlayerMessage(event, context, callbacks = {}) {
  let data = event?.data;

  if (typeof data === 'string') {
    data = safeParse(data);
  }

  if (!data || typeof data !== 'object') return null;

  let normalized = null;

  if (isMegaplayEvent(event, data)) {
    normalized = normalizeMegaplayEvent(data, context);
  } else if (isVidnestEvent(event, data)) {
    normalized = normalizeVidnestEvent(data, context);
  }

  if (!normalized) return null;

  const stored = upsertProgress(normalized);

  if (callbacks.onProgress) {
    callbacks.onProgress(stored);
  }

  if (
    stored.status === 'completed' &&
    callbacks.onComplete &&
    (stored.lastEvent === 'complete' || stored.lastEvent === 'PLAYER_EVENT:ended')
  ) {
    callbacks.onComplete(stored);
  }

  if (stored.status === 'error' && callbacks.onError) {
    callbacks.onError(stored);
  }

  if (stored.lastEvent === 'PLAYER_EVENT:play' && callbacks.onPlaying) {
    callbacks.onPlaying(stored);
  }

  return stored;
}

function exportHistoryJSON() {
  const all = getAllProgress();
  return JSON.stringify(Object.values(all));
}

function exportAnimeHistoryJSON(anilistId) {
  return JSON.stringify(getAllEntriesForAnime(anilistId));
}

export {
  STORAGE_KEY,
  buildEntryKey,
  getAllProgress,
  saveAllProgress,
  getProgressEntry,
  getResumeTime,
  getAllEntriesForAnime,
  deleteProgressEntry,
  clearAllProgress,
  upsertProgress,
  normalizeMegaplayEvent,
  normalizeVidnestEvent,
  handlePlayerMessage,
  exportHistoryJSON,
  exportAnimeHistoryJSON,
};
