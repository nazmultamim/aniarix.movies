/**
 * Compatibility helpers retained for legacy anime metadata adapters.
 * Anime identity is no longer persisted: the verified application schema has
 * no anime catalog table and must not receive AniList or MAL identifiers.
 */
function normalizeId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export class AnimeIdentityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AnimeIdentityError';
  }
}

export class AnimeIdentityConflictError extends AnimeIdentityError {
  constructor(message) {
    super(message);
    this.name = 'AnimeIdentityConflictError';
  }
}

export function createAnimeIdentity({ anilistId = null, malId = null } = {}) {
  return { anilistId: normalizeId(anilistId), malId: normalizeId(malId) };
}

export function hasAnimeIdentity(identity) {
  return Boolean(identity?.anilistId || identity?.malId);
}

export function applyAnimeIdentity(anime, identity) {
  return { ...anime, ...createAnimeIdentity(identity) };
}

export async function resolveAnimeIdentity(identity) {
  return createAnimeIdentity(identity);
}

// These no-op adapters keep older, unreachable anime metadata code from
// attempting writes to tables that are absent from the verified schema.
export async function persistAnimeCatalogMetadata(anime) {
  return createAnimeIdentity(anime);
}

export async function persistTrustedAniListAnime(anime) {
  return createAnimeIdentity(anime);
}

export async function persistTrustedAnimeIdentity(identity) {
  return createAnimeIdentity(identity);
}

export async function getAnimeFromCatalog() {
  return null;
}

export async function getAnimeCollectionFromCatalog() {
  return [];
}
