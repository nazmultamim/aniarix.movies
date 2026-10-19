/**
 * Application-side contract for the live AniArix Supabase schema.
 * This JavaScript project has no generated Supabase TypeScript types; this
 * declaration records the verified PostgREST table and RPC contract without
 * introducing a schema-generation or migration workflow.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type MediaType = 'movie' | 'tv';
export type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';
export type UserMediaListType = 'favorite' | 'watchlist';

export interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchHistoryRow {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string | null;
  poster: string | null;
  season_number: number | null;
  episode_number: number | null;
  language: string;
  current_time_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  completed: boolean;
  server: string | null;
  status: WatchStatus;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserMediaListRow {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  list_type: UserMediaListType;
  created_at: string;
}

export interface UserMediaRatingRow {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerProviderRow {
  id: string;
  name: string;
  provider_key: string;
  base_url: string | null;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AppSettingRow {
  key: string;
  value: Json;
  updated_at: string;
  updated_by: string | null;
}

export interface AdminAuditLogRow {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Json;
  created_at: string;
}

type Relationship = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

/** Relationship metadata was omitted by the available PostgREST OpenAPI schema. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Pick<ProfileRow, 'id' | 'username'> & Partial<ProfileRow>; Update: Partial<ProfileRow>; Relationships: Relationship[] };
      watch_history: { Row: WatchHistoryRow; Insert: Partial<WatchHistoryRow> & Pick<WatchHistoryRow, 'user_id' | 'tmdb_id' | 'media_type'>; Update: Partial<WatchHistoryRow>; Relationships: Relationship[] };
      user_media_list: { Row: UserMediaListRow; Insert: Pick<UserMediaListRow, 'user_id' | 'tmdb_id' | 'media_type' | 'list_type'> & Partial<UserMediaListRow>; Update: never; Relationships: Relationship[] };
      user_media_ratings: { Row: UserMediaRatingRow; Insert: Pick<UserMediaRatingRow, 'user_id' | 'tmdb_id' | 'media_type' | 'rating'> & Partial<UserMediaRatingRow>; Update: Partial<UserMediaRatingRow>; Relationships: Relationship[] };
      app_settings: { Row: AppSettingRow; Insert: Pick<AppSettingRow, 'key' | 'value'> & Partial<AppSettingRow>; Update: Partial<AppSettingRow>; Relationships: Relationship[] };
      player_providers: { Row: PlayerProviderRow; Insert: Pick<PlayerProviderRow, 'name' | 'provider_key'> & Partial<PlayerProviderRow>; Update: Partial<PlayerProviderRow>; Relationships: Relationship[] };
      admin_audit_logs: { Row: AdminAuditLogRow; Insert: Partial<AdminAuditLogRow> & Pick<AdminAuditLogRow, 'action'>; Update: never; Relationships: Relationship[] };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_profile: { Args: Record<string, never>; Returns: unknown };
      upsert_watch_progress: {
        Args: { p_media_type: MediaType; p_tmdb_id: number; p_season_number?: number | null; p_episode_number?: number | null; p_current_time_seconds?: number; p_duration_seconds?: number; p_title?: string | null; p_poster?: string | null; p_language?: string | null; p_server?: string | null; p_event_at?: string | null; p_mark_completed?: boolean };
        Returns: unknown;
      };
      set_watch_status: {
        Args: { p_media_type: MediaType; p_tmdb_id: number; p_status: WatchStatus; p_season_number?: number | null; p_episode_number?: number | null; p_title?: string | null; p_poster?: string | null };
        Returns: unknown;
      };
      continue_watching: { Args: { p_limit?: number }; Returns: unknown };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
