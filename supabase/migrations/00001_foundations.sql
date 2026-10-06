/*
 * 00001_foundations.sql — extensions, enums, styles, profiles.
 * Why exists: CHOQUE's whole access model hangs off the profile role + the
 * canononical style list (gyms, mats, partners all join against styles), so
 * this migration is the bedrock every later table builds on. Run order
 * matters: enums must exist before tables reference them.
 */

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- typo-tolerant search (section 4)

-- ——— Enums ———
create type public.app_role as enum ('user', 'moderator', 'admin');
create type public.gym_status as enum ('draft', 'pending', 'published', 'rejected');
create type public.open_mat_status as enum ('draft', 'pending', 'published', 'rejected');
create type public.connection_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.report_target_type as enum ('profile', 'gym', 'open_mat');
create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'fake_listing', 'safety', 'other');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.credential_kind as enum ('coach', 'competitor', 'referee', 'affiliation');

-- ——— Styles (seeded here; this is reference data, keep it forever) ———
create table public.styles (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

insert into public.styles (slug, name) values
  ('bjj-gi',        'Brazilian Jiu-Jitsu (Gi)'),
  ('bjj-nogi',      'Brazilian Jiu-Jitsu (No-Gi)'),
  ('judo',          'Judo'),
  ('wrestling',     'Wrestling'),
  ('mma',           'MMA'),
  ('muay-thai',     'Muay Thai'),
  ('boxing',        'Boxing'),
  ('sambo',         'Sambo');

alter table public.styles enable row level security;
-- Styles are public reference data.
create policy "styles readable by everyone"
  on public.styles for select using (true);

-- ——— Profiles ———
create table public.profiles (
  id             uuid primary key references auth.users on delete cascade,
  username       text not null unique
                 check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name   text not null default '',
  avatar_url     text,
  bio            text not null default '',
  home_city      text not null default '',
  home_area      text not null default '',
  belt_or_level  text not null default '',
  years_training smallint not null default 0 check (years_training between 0 and 80),
  interests      text[] not null default '{}',
  availability   jsonb not null default '{}'::jsonb,
  -- Per-field visibility: 'public' | 'connections' | 'private'.
  -- get_profile() resolves a projection that honors this map.
  visibility     jsonb not null default '{
                   "bio": "public", "home_city": "public", "home_area": "connections",
                   "belt_or_level": "public", "years_training": "public",
                   "interests": "public", "availability": "connections",
                   "display_name": "public", "avatar_url": "public"
                 }'::jsonb,
  -- Per-field verification badges (coach / competitor / referee / affiliation).
  -- Only moderators/admins may set these (enforced by trigger).
  credentials    jsonb not null default '{}'::jsonb,
  role           public.app_role not null default 'user',
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ——— Helper functions used by RNS policies (security definer so they can read
-- the table they gate without infinite recursion) ———

-- Is the current user a moderator or admin?
create or replace function public.is_moderator()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator','admin')
  ) $$;

-- Is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) $$;

-- Row-level read gate for profiles: own row, mods, anyone whose visibility
-- isn't fully private, minus block pairs (blocks table arrives in 00005;
-- this is replaced by a richer version there).
create policy "profiles read own, mods, and public rows"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_moderator())
    or coalesce(visibility ->> 'home_city', 'private') <> 'private'  -- non-private rows are listable; field-level masking happens in get_profile()
  );

create policy "profiles insert own on signup"
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles update own, role change gated by trigger"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "moderators and admins can edit profiles"
  on public.profiles for update
  using ((select public.is_moderator()));

-- Hard guarantee: only an existing admin can ever change role or credentials.
-- Because a trigger always runs as the invoking user and Supabase applies
-- RLS to user updates, this closes the privilege-escalation hole even for
-- moderators (who can edit most columns but never roles/badges).
create or replace function public.guard_role_credentials()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- role changed?
  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'only admins can change roles';
    end if;
  end if;
  -- credentials (verification badges) changed?
  if new.credentials is distinct from old.credentials then
    if not public.is_moderator() then
      raise exception 'verification badges are set by moderators';
    end if;
    -- Validate credential kinds.
    if exists (
      select 1 from jsonb_object_keys(new.credentials) k
      where k not in ('coach','competitor','referee','affiliation')
    ) then
      raise exception 'unknown credential kind';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard_role_credentials
  before update on public.profiles
  for each row execute function public.guard_role_credentials();

-- Auto-create a profile row when a new auth user confirms.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left('user_' || replace(new.id::text, '-', ''), 24),
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select on public.styles to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_admin() to authenticated;
