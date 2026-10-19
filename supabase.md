# Supabase Project Reference — "aniarix.movies"
*Generated 2026-10-18 from the live project (database clock).*
*Written so any AI/LLM can parse it to get full context of the database schema, auth flow, and security model.*

> **Verification status:** every statement below was read from the live database, or checked by behavioral tests run as `anon`, a normal user, an admin and `service_role` in a transaction that was rolled back. The database has **not** been tested against the real Next.js application.

---

## 1. Project Metadata

| Field | Value |
|---|---|
| Project name | `aniarix.movies` |
| Project ref / ID | `fkyatugcepebsclrxims` |
| Organization ID | `xgkptkmgkhchtaxotpgr` |
| Region | `ap-southeast-2` (Sydney) |
| Status | `ACTIVE_HEALTHY` |
| Postgres version | `17.11` (engine 17, GA release channel) |
| Created at | 2026-10-13T09:22:00Z |
| Database host | `db.fkyatugcepebsclrxims.supabase.co` |

**App domain:** a **movie and TV streaming / discovery app** (AniArix). Architecture rule: **TMDB provides all media metadata, Upstash Redis caches it, Supabase stores only user and application data.** There are deliberately **no catalog tables and no database cache table**.

---

## 2. Installed Postgres Extensions

| Extension | Version | Schema | Purpose |
|---|---|---|---|
| `plpgsql` | 1.0 | pg_catalog | All custom functions and triggers |
| `uuid-ossp` | 1.1 | extensions | Supabase default (unused by this schema) |
| `pgcrypto` | 1.3 | extensions | Supabase default (unused by this schema) |
| `pg_stat_statements` | 1.11 | extensions | Query statistics |
| `supabase_vault` | 0.3.1 | vault | Supabase secrets vault (0 secrets stored) |

No `pg_trgm`, `pg_cron`, `pg_net`, vector or PostGIS. UUIDs use the built-in `gen_random_uuid()`.

---

## 3. Schemas

| Schema | Exposed to REST API? | Contents |
|---|---|---|
| `public` | Yes | 7 application tables + 6 callable/trigger functions |
| `private` | **No** | Helper and trigger functions (never callable through the API) |
| `auth`, `storage`, `vault` | Supabase-managed | See sections 8 and 9 |

---

## 4. `public` Schema — Application Tables (7)

**Row counts at export:** `app_settings` = 8, every other table = 0 (new project, no users yet).
**RLS is enabled on all 7 tables.** Default Supabase grants were revoked and re-granted minimally (see each table).

### 4.1 `public.profiles`
One row per auth user. Created only by trigger, never by clients.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | — | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `username` | text | no | — | UNIQUE; CHECK `^[a-z0-9_]{3,30}$` |
| `full_name` | text | yes | — | ≤ 100 chars |
| `avatar_url` | text | yes | — | must start with `https://`, ≤ 2048 chars |
| `bio` | text | yes | — | ≤ 500 chars |
| `role` | text | no | `'user'` | CHECK `IN ('user','admin')` |
| `is_public` | boolean | no | `true` | Controls public visibility |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | Set by trigger |

**Column privileges (key privacy mechanism):**
| Role | SELECT columns | UPDATE columns |
|---|---|---|
| `anon` | `id, username, avatar_url, bio, is_public, created_at` | none |
| `authenticated` | same six columns | `username, full_name, avatar_url, bio, is_public` |

`role`, `full_name` and `updated_at` are **not readable through the API**. A plain `select('*')` on this table fails with a permission error; list columns explicitly, or call `get_my_profile()` to read your own full row. `role` can **never** be updated through the API, by anyone.

**RLS policies**
| Policy | Command | Role | Rule |
|---|---|---|---|
| `profiles_select_anon` | SELECT | anon | `is_public` |
| `profiles_select_authenticated` | SELECT | authenticated | `is_public OR id = auth.uid() OR private.is_admin()` |
| `profiles_update_own` | UPDATE | authenticated | `id = auth.uid()` (USING and WITH CHECK) |

No INSERT or DELETE policy and no INSERT/DELETE privilege for API roles: profiles are created by the signup trigger and removed by cascade when the auth user is deleted.

**Triggers:** `profiles_set_updated_at` (BEFORE UPDATE), `profiles_prevent_role_change` (BEFORE UPDATE OF role), `profiles_audit_role` (AFTER UPDATE OF role, only when the role actually changes).

---

### 4.2 `public.watch_history`
Playback progress and status. One row per movie, one row per TV episode, plus an optional **series-level row** (TV with `season_number` and `episode_number` both NULL) that carries only a status.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `user_id` | uuid | no | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `tmdb_id` | integer | no | — | CHECK `> 0` |
| `media_type` | text | no | — | CHECK `IN ('movie','tv')` |
| `title` | text | yes | — | Snapshot, ≤ 500 chars |
| `poster` | text | yes | — | Snapshot, ≤ 2048 chars |
| `season_number` | integer | yes | — | |
| `episode_number` | integer | yes | — | |
| `language` | text | no | `'en'` | 1–16 chars |
| `current_time_seconds` | integer | no | 0 | CHECK `>= 0` |
| `duration_seconds` | integer | no | 0 | CHECK `>= 0` |
| `progress_percent` | numeric(5,2) | no | 0 | CHECK 0–100 |
| `completed` | boolean | no | false | Per movie / per **episode**, never per series |
| `server` | text | yes | — | ≤ 64 chars |
| `status` | text | no | `'watching'` | CHECK `IN ('watching','completed','on_hold','dropped','plan_to_watch')` |
| `last_watched_at` | timestamptz | no | `now()` | Moves only on playback changes |
| `created_at` / `updated_at` | timestamptz | no | `now()` | |

**Shape constraints:** movies must have NULL season and episode; TV must have either both or neither (`watch_history_shape`); a series-level row cannot carry playback data (`watch_history_series_row_idle`).
**Uniqueness:** `UNIQUE NULLS NOT DISTINCT (user_id, media_type, tmdb_id, season_number, episode_number)` — movie rows and series-level rows are unique per user, episodes are unique per season+episode, and a movie and a TV show with the same TMDB id never collide.

**Indexes:** `watch_history_unique` (also serves "user + media" and "specific episode" lookups), `watch_history_user_recent_idx (user_id, last_watched_at DESC)`, `watch_history_user_type_recent_idx (user_id, media_type, last_watched_at DESC)`, `watch_history_continue_idx (user_id, last_watched_at DESC) WHERE NOT completed AND status = 'watching'`.

**Trigger:** `watch_history_before_update` → `private.watch_history_before_update()`: identity columns (user, media type, tmdb id, season, episode) are **immutable**; `updated_at` always stamped; `last_watched_at` set to `now()` **only** when `current_time_seconds` changed and the caller did not set `last_watched_at` explicitly.

**RLS:** `watch_history_owner_all` — ALL for `authenticated`, `user_id = auth.uid()` (USING and WITH CHECK). No admin override. `anon` has no access.
**Grants:** `authenticated`: SELECT, INSERT, UPDATE, DELETE.

---

### 4.3 `public.user_media_list`
Favorites and watchlist. Rows are immutable (add or delete only).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `user_id` | uuid | no | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `tmdb_id` | integer | no | — | CHECK `> 0` |
| `media_type` | text | no | — | CHECK `IN ('movie','tv')` |
| `list_type` | text | no | — | CHECK `IN ('favorite','watchlist')` |
| `created_at` | timestamptz | no | `now()` | |

**Unique:** `(user_id, media_type, tmdb_id, list_type)`. **Index:** `user_media_list_user_type_idx (user_id, list_type, created_at DESC)`.
**RLS:** `user_media_list_owner_all` (owner only). **Grants:** `authenticated`: SELECT, INSERT, DELETE (no UPDATE).

---

### 4.4 `public.user_media_ratings`
Private per-user ratings and reviews (not publicly readable).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `user_id` | uuid | no | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `tmdb_id` | integer | no | — | CHECK `> 0` |
| `media_type` | text | no | — | CHECK `IN ('movie','tv')` |
| `rating` | numeric(3,1) | no | — | CHECK 1.0–10.0 **in steps of 0.5** |
| `review` | text | yes | — | ≤ 5000 chars |
| `created_at` / `updated_at` | timestamptz | no | `now()` | `updated_at` set by trigger |

**Unique:** `(user_id, media_type, tmdb_id)`. **Trigger:** `user_media_ratings_set_updated_at`.
**RLS:** `user_media_ratings_owner_all` (owner only). **Grants:** `authenticated`: SELECT, INSERT, UPDATE, DELETE.

---

### 4.5 `public.app_settings`
Admin-only JSONB configuration. **Never store secrets here.**

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `key` | text | no | — | PK; CHECK `^[a-z0-9_]{1,64}$` |
| `value` | jsonb | no | — | |
| `updated_at` | timestamptz | no | `now()` | Set by trigger |
| `updated_by` | uuid | yes | — | FK → `auth.users(id)` ON DELETE SET NULL; stamped from `auth.uid()` by trigger |

**Seeded keys (8):** `site` (name "AniArix", description, logo_url null, default_language `en-US`), `catalog` (`{"provider":"tmdb","cache":"upstash-redis"}`), `media_sections` (movies/tv true), `features` (watch_progress, watchlist, favorites, ratings all true), `maintenance` (`enabled:false`), `playback_defaults` (`language:"en"`, `autoplay:false`), `homepage` (ordered section list), `tmdb_cache_ttl` (seconds: trending 3600, popular 3600, top_rated 21600, upcoming 21600, details 86400, seasons 43200, search 600).

**RLS:** `app_settings_admin_all` — ALL for `authenticated` when `private.is_admin()`. `anon` has no access. Because normal users cannot read this table, **public settings must be read by trusted server code using the service role.**
**Triggers:** `app_settings_set_updated_at`, `app_settings_stamp_updated_by`, `app_settings_audit`.
**Index:** `app_settings_updated_by_idx` (partial, FK support).

---

### 4.6 `public.player_providers`
Admin-managed external player providers. **Empty by design** (no providers are seeded).

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `name` | text | no | — | 1–80 chars |
| `provider_key` | text | no | — | UNIQUE; CHECK `^[a-z0-9_-]{2,40}$` |
| `base_url` | text | yes | — | CHECK `https://` only, no spaces/`<`/`>`/`"`, ≤ 2048 chars |
| `enabled` | boolean | no | false | CHECK: enabled requires `base_url` |
| `priority` | integer | no | 0 | |
| `created_at` / `updated_at` | timestamptz | no | `now()` | |

The database stores no scripts or HTML. Mapping a `provider_key` to a URL path pattern is application code. Provider availability, embed security and the legal right to stream are **application and legal concerns the schema cannot guarantee.**

**RLS policies:** `player_providers_select_anon` (`enabled`), `player_providers_select_authenticated` (`enabled OR is_admin`), and admin-only `_insert_admin`, `_update_admin`, `_delete_admin`. **Index:** `player_providers_enabled_priority_idx (priority DESC) WHERE enabled`.
**Triggers:** `player_providers_set_updated_at`, `player_providers_audit`.
**Grants:** `anon`: SELECT; `authenticated`: SELECT, INSERT, UPDATE, DELETE (RLS limits writes to admins).

---

### 4.7 `public.admin_audit_logs`
Trail of administrative changes.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `admin_user_id` | uuid | yes | — | FK → `auth.users(id)` ON DELETE SET NULL; NULL = SQL editor / service role |
| `action` | text | no | — | e.g. `role_changed`, `insert`, `update`, `delete` |
| `target_type` | text | yes | — | e.g. `profiles`, `app_settings`, `player_providers` |
| `target_id` | text | yes | — | |
| `details` | jsonb | no | `'{}'` | CHECK is a JSON object; never put secrets here |
| `created_at` | timestamptz | no | `now()` | |

**RLS:** `admin_audit_logs_select_admin` — SELECT for `authenticated` when admin. **No** INSERT/UPDATE/DELETE policy or privilege for API roles; rows are written by `SECURITY DEFINER` triggers and by `service_role`.
**Indexes:** `admin_audit_logs_created_idx (created_at DESC)`, `admin_audit_logs_admin_idx` (partial, FK support).

---

## 5. Custom Functions

| Function | Lang | Security | Executable by | Purpose |
|---|---|---|---|---|
| `public.handle_new_user()` | plpgsql | DEFINER, `search_path=''` | no API role (trigger only) | Creates the profile after signup |
| `public.get_my_profile()` | sql, STABLE | DEFINER, `search_path=''` | `authenticated` | Returns the caller's own full profile row, including private columns |
| `public.upsert_watch_progress(...)` | plpgsql | INVOKER, `search_path=''` | `authenticated` | Records playback for a movie or TV episode |
| `public.set_watch_status(...)` | plpgsql | INVOKER, `search_path=''` | `authenticated` | Changes status only |
| `public.continue_watching(p_limit)` | sql, STABLE | INVOKER, `search_path=''` | `authenticated` | Continue Watching list |
| `private.is_admin()` | sql, STABLE | DEFINER, `search_path=''` | `authenticated`, `service_role` | `true` if `auth.uid()` has role `admin`; used by RLS |
| `private.set_updated_at()` | plpgsql | INVOKER | none | Stamps `updated_at` |
| `private.prevent_role_change()` | plpgsql | INVOKER | none | Blocks role changes by signed-in non-admins |
| `private.username_candidate(name, email)` | plpgsql | INVOKER | none | Generates a username candidate |
| `private.watch_history_before_update()` | plpgsql | INVOKER | none | Identity immutability + `last_watched_at` rule |
| `private.stamp_updated_by()` | plpgsql | INVOKER | none | Sets `app_settings.updated_by` |
| `private.log_role_change()` | plpgsql | DEFINER | none | Audit row for role changes |
| `private.log_config_change()` | plpgsql | DEFINER | none | Audit row for settings/provider changes |

`anon` can execute **none** of these.

### 5.1 `upsert_watch_progress(p_media_type, p_tmdb_id, p_season_number, p_episode_number, p_current_time_seconds, p_duration_seconds, p_title, p_poster, p_language, p_server, p_event_at, p_mark_completed)`
- The user is always `auth.uid()` (never client-supplied). Raises `28000` if not signed in, `22023` for invalid shape (movie with season/episode, TV without both, unknown media type).
- `progress_percent = current/duration × 100` (clamped); `completed` at **≥ 90%** or when `p_mark_completed`; **completed is sticky** (a rewatch never un-completes). Status becomes `completed` or `watching`.
- **Stale-write protection:** an event older than the stored `last_watched_at` is ignored and the stored row is returned unchanged. `p_event_at` is capped at `now()`.
- Title, poster, language and server overwrite only when a new value is supplied. The conflict target is the NULLS NOT DISTINCT unique constraint, so nullable season/episode keys behave correctly.

### 5.2 `set_watch_status(p_media_type, p_tmdb_id, p_status, p_season_number, p_episode_number, p_title, p_poster)`
Creates or updates a row changing **only** `status` (and `completed` becomes true if status is `completed`; it is never reset to false). Never touches position, duration, progress, episode, or `last_watched_at`. Pass season and episode both, or neither (the series-level row).

### 5.3 `continue_watching(p_limit default 20, max 100)`
Latest playable record per title (series-level rows skipped, position > 0), shown only if that record is `watching` and not completed. If a TV episode is completed, the app decides whether to offer the next episode.

---

## 6. Trigger Inventory (11)

| Table | Trigger | Timing / event | Function |
|---|---|---|---|
| `auth.users` | `on_auth_user_created` | AFTER INSERT | `public.handle_new_user()` |
| `profiles` | `profiles_set_updated_at` | BEFORE UPDATE | `private.set_updated_at()` |
| `profiles` | `profiles_prevent_role_change` | BEFORE UPDATE OF role | `private.prevent_role_change()` |
| `profiles` | `profiles_audit_role` | AFTER UPDATE OF role (when changed) | `private.log_role_change()` |
| `watch_history` | `watch_history_before_update` | BEFORE UPDATE | `private.watch_history_before_update()` |
| `user_media_ratings` | `user_media_ratings_set_updated_at` | BEFORE UPDATE | `private.set_updated_at()` |
| `app_settings` | `app_settings_set_updated_at` | BEFORE UPDATE | `private.set_updated_at()` |
| `app_settings` | `app_settings_stamp_updated_by` | BEFORE INSERT/UPDATE | `private.stamp_updated_by()` |
| `app_settings` | `app_settings_audit` | AFTER INSERT/UPDATE/DELETE | `private.log_config_change()` |
| `player_providers` | `player_providers_set_updated_at` | BEFORE UPDATE | `private.set_updated_at()` |
| `player_providers` | `player_providers_audit` | AFTER INSERT/UPDATE/DELETE | `private.log_config_change()` |

`user_media_list` and `admin_audit_logs` have no triggers (immutable rows).

---

## 7. Signup / New-User Flow

```
1. Client calls supabase.auth.signUp()
   → row inserted into auth.users
2. AFTER INSERT trigger on_auth_user_created → public.handle_new_user() [SECURITY DEFINER]
3. handle_new_user():
   a. Calls private.username_candidate(): letters/digits from full_name
      (raw_user_meta_data->>'full_name'); if shorter than 3 characters, from the
      email local part; if still shorter, 'user'. Lowercased, max 20 chars,
      plus 4 random digits.
   b. INSERTs public.profiles (id = auth user id, username, full_name, role = 'user').
   c. Username collisions are caught (unique_violation) and retried, up to 8 times,
      then falls back to 'user' + first 12 hex chars of the user id
      (unique by construction). Safe under concurrent signups because
      uniqueness is enforced by the UNIQUE constraint, not by a check-then-insert.
   d. Any other error is NOT swallowed: signup fails loudly.
   e. If the profile already exists, it exits quietly (idempotent).
4. Result: exactly one profile per user; role is always 'user'.
```
Non-Latin names produce an empty base and fall back to the email prefix. **Admins are never created by signup**: promote manually (section 11).

---

## 8. Row Level Security — Summary

| Table | RLS | anon | authenticated | Admin extra |
|---|---|---|---|---|
| `profiles` | on | public profiles (6 columns) | public profiles + own row; update own non-privileged columns | sees all profiles |
| `watch_history` | on | none | own rows, full CRUD | none |
| `user_media_list` | on | none | own rows: select, insert, delete | none |
| `user_media_ratings` | on | none | own rows, full CRUD | none |
| `app_settings` | on | none | none | full CRUD |
| `player_providers` | on | enabled rows | enabled rows | full CRUD |
| `admin_audit_logs` | on | none | none | read only |

Anonymous access is explicitly limited to public profile columns and enabled providers. No table is writable by `anon`.

---

## 9. Storage

| Bucket | Public | Size limit | MIME types | Objects |
|---|---|---|---|---|
| `avatars` | yes | 2 MB | `image/jpeg`, `image/png`, `image/webp` | 0 |
| `site-assets` | yes | 5 MB | `image/jpeg`, `image/png`, `image/webp` | 0 — **orphan from an earlier design; has no policies, so only the service role can write. Supabase blocks deleting buckets via SQL; delete it in the dashboard if unwanted.** |

**`avatars` policies** (on `storage.objects`, role `authenticated`): `avatars_select_own`, `avatars_insert_own`, `avatars_update_own`, `avatars_delete_own`. Each requires `bucket_id = 'avatars'` and `(storage.foldername(name))[1] = auth.uid()::text`. The folder is compared as **text**, so a malformed path is denied cleanly instead of raising a uuid-cast error. Files are expected at `<user uuid>/<filename>`. Public files are served by URL without a SELECT policy, so the bucket **cannot be listed** by anonymous users.

---

## 10. Auth, Edge Functions, Migrations

- **Auth:** `auth.users` = 0 rows. Nothing else about auth configuration (providers, email confirmation, redirect URLs, password rules, leaked-password protection) is visible from SQL and was not checked.
- **Edge Functions:** none deployed.
- **Scheduled jobs:** none (`pg_cron` not installed).
- **Realtime:** no tables are published.
- **Migration history (6):**

| Version | Name | Note |
|---|---|---|
| 20261014094148 | `01_foundation_profiles_auth` | First design |
| 20261014094215 | `02_tmdb_catalog` | First design (catalog tables, later removed) |
| 20261014094245 | `03_user_data_and_progress` | First design |
| 20261014094316 | `04_admin_config_storage_seed` | First design |
| 20261014100112 | `05_v2_teardown_old_design` | Guarded: aborts if any user or application data exists |
| 20261014100233 | `06_v2_fresh_install` | **The complete current schema as one standalone script** |

---

## 11. Operating Notes

- **First admin:** sign up normally, then in the SQL editor run `update public.profiles set role = 'admin' where id = '<user uuid>';`. This is the only way: no API call can change a role, and the change is written to `admin_audit_logs`.
- **Server-only secrets** (never `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. None are stored in the database.
- **Service role use:** reading `app_settings`, public profile pages if more than the six public columns are needed, admin dashboards, writing audit rows, and changing roles.
- **Redundancy in the requirements:** `watch_history.status = 'plan_to_watch'` overlaps with `user_media_list.list_type = 'watchlist'`; both exist. Pick one for the UI.

---

## 12. Advisor Findings (snapshot)

| Severity | Finding | Status |
|---|---|---|
| WARN | `public.get_my_profile()` is a SECURITY DEFINER function executable by `authenticated` | **Intentional.** It returns only the caller's own row and is the only way to read private profile columns |
| INFO | 4 unused indexes (`watch_history_user_recent_idx`, `watch_history_continue_idx`, `player_providers_enabled_priority_idx`, `admin_audit_logs_created_idx`) | Expected on an empty database; they exist for known queries |

No ERROR-level findings. Unchecked (dashboard-only): leaked-password protection, MFA enforcement for admins, auth rate limits.

---

## 13. Relationship (ER) Summary

```
auth.users (id) 1───1 public.profiles (id, PK/FK, cascade)
auth.users (id) 1───* public.watch_history (user_id, cascade)
auth.users (id) 1───* public.user_media_list (user_id, cascade)
auth.users (id) 1───* public.user_media_ratings (user_id, cascade)
auth.users (id) 1───* public.app_settings (updated_by, set null)
auth.users (id) 1───* public.admin_audit_logs (admin_user_id, set null)
public.player_providers — standalone, no foreign keys
```
`tmdb_id` + `media_type` in the three user tables reference TMDB titles **logically only**, not by foreign key, because no catalog is stored. Movie and TV ids never collide because `media_type` is part of every key.

---

## 14. Summary for an AI Assistant Picking Up This Project

- **Stack:** Supabase (Postgres 17) + Supabase Auth + Storage; TMDB for metadata; Upstash Redis for caching; Next.js server-side. No Edge Functions, no scheduled jobs.
- **Core tables:** `profiles`, `watch_history`, `user_media_list`, `user_media_ratings`, `app_settings`, `player_providers`, `admin_audit_logs`. Do not add catalog or cache tables.
- **Write playback through `upsert_watch_progress`; change status through `set_watch_status`; read Continue Watching through `continue_watching()`.** Read your own private profile fields through `get_my_profile()` and never `select('*')` on `profiles`.
- **Security model:** owner-only RLS on user data, column-level privileges on `profiles`, roles changeable only via SQL editor or service role, admin-only settings, providers and audit logs. All helper functions live in the unexposed `private` schema.
- **Most important facts before writing code:** `app_settings` is unreadable by normal users (use the service role); a TV row with NULL season and episode is a series-level status row, not a playback record; `completed` is per movie or episode and sticky; `player_providers` is empty until an admin adds providers.