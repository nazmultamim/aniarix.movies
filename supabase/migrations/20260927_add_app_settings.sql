-- Adds a small, reusable key/value settings table for the admin panel,
-- starting with the DB keep-alive toggle. Admin-only via RLS, same
-- is_admin() helper your profiles policies already use.
--
-- Review before running. Apply with the Supabase SQL editor, or
-- `supabase db push` / the MCP "apply_migration" tool.

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

create policy "Admins can read settings"
  on public.app_settings for select
  using (is_admin());

create policy "Admins can upsert settings"
  on public.app_settings for insert
  with check (is_admin());

create policy "Admins can update settings"
  on public.app_settings for update
  using (is_admin());

-- keep updated_at fresh on every change
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.handle_updated_at();

-- seed the keepalive setting, off by default
insert into public.app_settings (key, value)
values ('auto_keepalive', jsonb_build_object('enabled', false))
on conflict (key) do nothing;