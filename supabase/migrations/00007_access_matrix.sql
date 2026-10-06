/*
 * 00007_access_matrix.sql — section 4A (v2) enforcement.
 *
 * - profiles.is_suspended is a STATUS FLAG, not a role. A suspended user can
 *   sign in and browse, but cannot post, submit, request connections, or
 *   appear in search.
 * - Suspend: moderators+ (admins can suspend staff; the last admin is
 *   protected). Unsuspend: ADMIN ONLY.
 * - Roles: only admins can change them; every change is audit-logged. The
 *   last remaining admin cannot be demoted, suspended, or deleted.
 * - Connection requests are capped per-day (default 10 / 24h).
 * - Account deletion: members can delete only themselves; admins can delete
 *   anyone except the last admin; moderators cannot delete accounts.
 * - Every server-side policy re-checks these rules — UI hiding is never the
 *   security mechanism.
 */

-- ——— Suspension flag & provenance ———
alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles (id) on delete set null;

create index if not exists profiles_suspended_idx on public.profiles (is_suspended) where is_suspended;

-- ——— Helpers ———

-- Is a user (default: caller) currently suspended?
create or replace function public.is_suspended(u uuid default (select auth.uid()))
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce((select is_suspended from public.profiles where id = u), false) $$;

-- Is the caller's email confirmed? (kept as a DB check so "email-verified
-- only" submissions are enforced server-side, not just in the UI)
create or replace function public.is_email_verified()
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce(
  (select email_confirmed_at is not null from auth.users where id = (select auth.uid())), false) $$;

-- How many admins exist? (used by last-admin protections)
create or replace function public.admin_count()
returns integer language sql stable security definer
set search_path = public
as $$ select (select count(*) from public.profiles where role = 'admin')::integer $$;

-- ——— Extended profile guard: roles, credentials, suspension, audit ———
create or replace function public.guard_role_credentials()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_diff jsonb := '{}'::jsonb;
begin
  -- ROLE CHANGE ----------------------------------------------------------
  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'only admins can change roles';
    end if;
    if old.role = 'admin' and new.role <> 'admin' and public.admin_count() = 1 then
      raise exception 'the last remaining admin cannot be demoted';
    end if;
    v_diff := v_diff || jsonb_build_object('role', jsonb_build_array(old.role, new.role));
  end if;

  -- CREDENTIALS (verification badges) ------------------------------------
  if new.credentials is distinct from old.credentials then
    if not public.is_moderator() then
      raise exception 'verification badges are set by moderators';
    end if;
    if exists (
      select 1 from jsonb_object_keys(new.credentials) k
      where k not in ('coach','competitor','referee','affiliation')
    ) then
      raise exception 'unknown credential kind';
    end if;
    v_diff := v_diff || jsonb_build_object('credentials', jsonb_build_array(old.credentials, new.credentials));
  end if;

  -- SUSPENSION ------------------------------------------------------------
  if new.is_suspended is distinct from old.is_suspended then
    if new.is_suspended then
      -- suspending: moderators+ may suspend members; only admins touch staff;
      if not public.is_moderator() then
        raise exception 'only moderators can suspend accounts';
      end if;
      if old.role in ('moderator','admin') and not public.is_admin() then
        raise exception 'only admins can suspend staff';
      end if;
      if old.role = 'admin' and public.admin_count() = 1 then
        raise exception 'the last remaining admin cannot be suspended';
      end if;
      new.suspended_by := (select auth.uid());
      new.suspended_at := now();
      v_diff := v_diff || '{"suspended": [false, true]}'::jsonb;
    else
      -- unsuspending: ADMIN ONLY
      if not public.is_admin() then
        raise exception 'only admins can unsuspend accounts';
      end if;
      new.suspended_by := null;
      new.suspended_at := null;
      v_diff := v_diff || '{"suspended": [true, false]}'::jsonb;
    end if;
  end if;

  -- Audit every privileged change.
  if v_diff <> '{}'::jsonb then
    insert into public.audit_log (actor_id, action, entity, entity_id, diff)
    values ((select auth.uid()), 'profile_moderation', 'profiles', old.id, v_diff);
  end if;
  return new;
end $$;

-- ——— Last-admin delete protection + moderator delete ban ———
create or replace function public.guard_profile_delete()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if old.role = 'admin' and public.admin_count() = 1 then
    raise exception 'the last remaining admin cannot be deleted';
  end if;
  if (select auth.uid()) = old.id then
    return old; -- members may delete themselves
  end if;
  if public.is_admin() then
    return old; -- admins may delete anyone else
  end if;
  raise exception 'only admins can delete other accounts';
end $$;

create trigger profiles_guard_delete
  before delete on public.profiles
  for each row execute function public.guard_profile_delete();

drop policy if exists "profiles delete own or admin" on public.profiles;
create policy "profiles delete: own row, or any row as admin"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- ——— Suspension: hidden from search, blocked from writing ———

-- Search / directory visibility: suspended users vanish for non-staff.
drop policy if exists "profiles read: own, mods, or non-private non-blocked" on public.profiles;
create policy "profiles read: own, mods, or visible non-suspended"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_moderator())
    or (
      not is_suspended
      and coalesce(visibility ->> 'home_city', 'private') <> 'private'
      and not public.has_blocked((select auth.uid()), id)
    )
  );

-- get_profile(): suspended profiles are invisible to regular members too.
create or replace function public.get_profile(target uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  p          public.profiles%rowtype;
  viewer     uuid := (select auth.uid());
  vis        jsonb;
  connected  boolean;
  blocked    boolean;
  admin_view boolean;
  out        jsonb := '{}'::jsonb;
  k          text;
begin
  select * into p from public.profiles where id = target;
  if not found then
    return null;
  end if;

  admin_view := public.is_moderator();

  -- Suspended accounts: hidden from everyone except themselves and staff.
  if p.is_suspended and viewer <> p.id and not admin_view then
    return null;
  end if;

  blocked := viewer is not null
             and viewer <> p.id
             and public.has_blocked(viewer, p.id);
  if blocked then
    return null;
  end if;

  connected := viewer is not null and public.are_connected(viewer, p.id);
  connected := connected or viewer = p.id or admin_view;

  vis := p.visibility;

  out := jsonb_build_object(
    'id', p.id,
    'username', case when coalesce(vis ->> 'username', 'public') = 'public'
                     or connected then p.username else null end
  );

  foreach k in array array['display_name','avatar_url','bio','home_city','home_area',
                           'belt_or_level','years_training','interests','availability'] loop
    declare
      mode text := coalesce(vis ->> k, 'private');
      val  jsonb := to_jsonb(p) -> k;
    begin
      if mode = 'public' then
        out := out || jsonb_build_object(k, val);
      elsif mode = 'connections' and connected then
        out := out || jsonb_build_object(k, val);
      else
        out := out || jsonb_build_object(k, null);
      end if;
    end;
  end loop;

  out := out || jsonb_build_object(
    'connection_state',
    case
      when viewer is null then 'anonymous'
      when viewer = p.id then 'self'
      when blocked then 'blocked'
      when public.are_connected(viewer, p.id) then 'connected'
      when exists (
        select 1 from public.connections c
        where c.requester_id = viewer and c.recipient_id = p.id and c.status = 'pending'
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.connections c
        where c.requester_id = p.id and c.recipient_id = viewer and c.status = 'pending'
      ) then 'incoming_pending'
      else 'none'
    end
  );

  out := out || jsonb_build_object('credentials', p.credentials);
  -- Staff sees the suspension flag so moderation queues can show it.
  out := out || jsonb_build_object('is_suspended',
    case when admin_view or viewer = p.id then p.is_suspended else null end);

  return out;
end $$;

-- ——— Submission / posting policies now reject suspended users ———

drop policy if exists "gyms insert: any member" on public.gyms;
create policy "gyms insert: active, email-verified member"
  on public.gyms for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and not public.is_suspended()
    and public.is_email_verified()
  );

drop policy if exists "open_mats insert: any member" on public.open_mats;
create policy "open_mats insert: active member"
  on public.open_mats for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and not public.is_suspended()
  );

drop policy if exists "reports insert by any member" on public.reports;
create policy "reports insert: active member"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and not public.is_suspended());

drop policy if exists "connections send" on public.connections;
create policy "connections send: active, unblocked member"
  on public.connections for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and not public.is_suspended()
    and not public.is_suspended(recipient_id)
    and exists (select 1 from public.profiles p where p.id = recipient_id)
    and not public.has_blocked(recipient_id, (select auth.uid()))
    and not public.has_blocked((select auth.uid()), recipient_id)
  );

drop policy if exists "events insert self or null" on public.events;
create policy "events insert: active member or anonymous"
  on public.events for insert
  to authenticated
  with check (
    (user_id = (select auth.uid()) and not public.is_suspended())
    or user_id is null
  );

-- Gyms: vistors can BROWSE published (already public), but only email-verified
-- members may submit — enforced above.

-- ——— Daily connection-request limit (10 per 24 hours per requester) ———
create or replace function public.connection_daily_limit()
returns integer language sql immutable
as $$ select 10 $$;

create or replace function public.enforce_connection_limit()
returns trigger language plpgsql
set search_path = public
as $$
declare
  cnt integer;
begin
  select count(*) into cnt
  from public.connections
  where requester_id = new.requester_id
    and created_at > now() - interval '24 hours';
  if cnt >= public.connection_daily_limit() then
    raise exception 'daily connection request limit (%) reached', public.connection_daily_limit();
  end if;
  return new;
end $$;

create trigger connections_daily_limit
  before insert on public.connections
  for each row execute function public.enforce_connection_limit();

grant execute on function public.is_suspended(uuid) to authenticated;
grant execute on function public.is_email_verified() to authenticated;
grant execute on function public.admin_count() to authenticated;
grant execute on function public.connection_daily_limit() to authenticated;
grant delete on public.profiles to authenticated;
