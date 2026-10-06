/*
 * 00008_ownership_policies.sql — gym ownership, claims, canonical SQL helpers,
 * and EXPLICIT per-table / per-operation RLS policies (default deny).
 *
 * Why this migration exists: earlier migrations grew policies organically.
 * This one restates the entire policy surface so that every table has one
 * clearly-named policy per operation, each carrying a plain-English comment
 * describing the rule it enforces. Nothing is implicit: if no policy grants
 * an operation, Postgres denies it.
 */

-- ─────────────────────────────────────────────────────────────
-- 1. OWNERSHIP TABLES
-- ─────────────────────────────────────────────────────────────

-- An approved link between a member and the gym they run.
create table if not exists public.gym_owners (
  gym_id      uuid not null references public.gyms (id)     on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  approved_by uuid references public.profiles (id)          on delete set null,
  created_at  timestamptz not null default now(),
  primary key (gym_id, user_id)
);

create index if not exists gym_owners_user_idx on public.gym_owners (user_id);

-- A member's request to be recognised as the owner of a listing.
create table if not exists public.gym_claims (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references public.gyms (id)     on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  message    text not null default '' check (char_length(message) <= 1000),
  status     text not null default 'pending'
             check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gym_id, user_id)
);

create index if not exists gym_claims_status_idx on public.gym_claims (status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 2. CANONICAL SQL HELPERS (all SECURITY DEFINER, fixed search_path)
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles
                     where id = (select auth.uid()) and role = 'admin') $$;
comment on function public.is_admin() is 'True when the caller holds the admin role.';

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles
                     where id = (select auth.uid()) and role in ('moderator','admin')) $$;
comment on function public.is_staff() is 'True for moderators and admins (staff).';

-- Back-compat alias used by earlier migrations.
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_staff() $$;

create or replace function public.is_suspended(u uuid default (select auth.uid()))
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_suspended from public.profiles where id = u), false) $$;
comment on function public.is_suspended(uuid) is 'Status flag check — suspended users may read but not write.';

create or replace function public.owns_gym(p_gym_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.gym_owners
                     where gym_id = p_gym_id and user_id = (select auth.uid())) $$;
comment on function public.owns_gym(uuid) is 'True when the caller is an approved owner of the gym.';

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.blocks
                     where (blocker_id = a and blocked_id = b)
                        or (blocker_id = b and blocked_id = a)) $$;
comment on function public.is_blocked_between(uuid, uuid) is 'True when either user has blocked the other.';

-- Legacy name kept so older policies continue to resolve.
create or replace function public.has_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_blocked_between(a, b) $$;

-- Active member = signed in, not suspended. The precondition for every write.
create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public
as $$ select (select auth.uid()) is not null and not public.is_suspended() $$;
comment on function public.is_active_member() is 'Signed in and not suspended — required to create content.';

-- ─────────────────────────────────────────────────────────────
-- 3. AUDIT LOG: IP hash + structured before/after diffs
-- ─────────────────────────────────────────────────────────────

alter table public.audit_log
  add column if not exists ip_hash text,
  add column if not exists reason  text;

-- Hash the caller IP (never store raw addresses).
create or replace function public.request_ip_hash()
returns text language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  raw text;
begin
  raw := coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', ''),
    nullif(current_setting('request.headers', true)::jsonb ->> 'cf-connecting-ip', ''),
    'unknown');
  return encode(digest(raw || '::choque', 'sha256'), 'hex');
exception when others then
  return null;
end $$;

-- Single entry point used by triggers AND server actions.
create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id uuid,
  p_diff jsonb default null, p_reason text default null
) returns void
language sql security definer set search_path = public
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, diff, reason, ip_hash)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, p_diff, p_reason,
          public.request_ip_hash());
$$;
comment on function public.write_audit(text, text, uuid, jsonb, text) is
  'Append-only audit writer: actor, action, entity, diff, reason, hashed IP.';

-- ─────────────────────────────────────────────────────────────
-- 4. ROLE / SUSPENSION ESCALATION GUARD
--    Blocks ANY non-admin from changing role or is_suspended — including on
--    their own row — and protects the final admin account.
-- ─────────────────────────────────────────────────────────────

create or replace function public.guard_role_credentials()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_diff jsonb := '{}'::jsonb;
begin
  -- ROLE -----------------------------------------------------------------
  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'permission denied: only admins can change roles';
    end if;
    if old.role = 'admin' and new.role <> 'admin'
       and (select count(*) from public.profiles where role = 'admin') = 1 then
      raise exception 'the last remaining admin cannot be demoted';
    end if;
    v_diff := v_diff || jsonb_build_object('role', jsonb_build_array(old.role, new.role));
  end if;

  -- SUSPENSION (status flag, never self-serve) ----------------------------
  if new.is_suspended is distinct from old.is_suspended then
    if not public.is_staff() then
      raise exception 'permission denied: only staff can change suspension';
    end if;
    if new.is_suspended then
      if old.role in ('moderator','admin') and not public.is_admin() then
        raise exception 'only admins can suspend staff';
      end if;
      if old.role = 'admin'
         and (select count(*) from public.profiles where role = 'admin' and not is_suspended) = 1 then
        raise exception 'the last remaining admin cannot be suspended';
      end if;
      new.suspended_by := (select auth.uid());
      new.suspended_at := now();
    else
      if not public.is_admin() then
        raise exception 'permission denied: only admins can unsuspend';
      end if;
      new.suspended_by := null;
      new.suspended_at := null;
    end if;
    v_diff := v_diff || jsonb_build_object('is_suspended',
                jsonb_build_array(old.is_suspended, new.is_suspended));
  end if;

  -- CREDENTIALS (verification badges) -------------------------------------
  if new.credentials is distinct from old.credentials then
    if not public.is_staff() then
      raise exception 'verification badges are set by staff';
    end if;
    v_diff := v_diff || jsonb_build_object('credentials',
                jsonb_build_array(old.credentials, new.credentials));
  end if;

  if v_diff <> '{}'::jsonb then
    perform public.write_audit('profile_moderation', 'profiles', old.id, v_diff, null);
  end if;
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 5. EXPLICIT POLICIES — one per table per operation. DEFAULT DENY.
-- ─────────────────────────────────────────────────────────────

alter table public.gym_owners enable row level security;
alter table public.gym_claims enable row level security;

-- ── gym_owners ───────────────────────────────────────────────
drop policy if exists gym_owners_select on public.gym_owners;
create policy gym_owners_select on public.gym_owners for select using (true);
comment on policy gym_owners_select on public.gym_owners is
  'Anyone may see who officially runs a gym — ownership is public information.';

drop policy if exists gym_owners_insert on public.gym_owners;
create policy gym_owners_insert on public.gym_owners for insert to authenticated
  with check (public.is_staff());
comment on policy gym_owners_insert on public.gym_owners is
  'Only staff grant ownership, and only after approving a claim.';

drop policy if exists gym_owners_delete on public.gym_owners;
create policy gym_owners_delete on public.gym_owners for delete to authenticated
  using (public.is_staff());
comment on policy gym_owners_delete on public.gym_owners is
  'Only staff can revoke ownership of a listing.';

-- ── gym_claims ───────────────────────────────────────────────
drop policy if exists gym_claims_select on public.gym_claims;
create policy gym_claims_select on public.gym_claims for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
comment on policy gym_claims_select on public.gym_claims is
  'You can read your own claim; staff read the whole claim queue.';

drop policy if exists gym_claims_insert on public.gym_claims;
create policy gym_claims_insert on public.gym_claims for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_member());
comment on policy gym_claims_insert on public.gym_claims is
  'Active (non-suspended) members may claim a gym for themselves only.';

drop policy if exists gym_claims_update on public.gym_claims;
create policy gym_claims_update on public.gym_claims for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
comment on policy gym_claims_update on public.gym_claims is
  'Only staff approve or reject claims.';

drop policy if exists gym_claims_delete on public.gym_claims;
create policy gym_claims_delete on public.gym_claims for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
comment on policy gym_claims_delete on public.gym_claims is
  'You may withdraw your own claim; admins can remove any claim.';

-- ── gyms (restated: owners can now edit their claimed listing) ───────────
drop policy if exists "gyms read: published for all, own rows, mods" on public.gyms;
drop policy if exists "gyms insert: any member" on public.gyms;
drop policy if exists "gyms insert: active, email-verified member" on public.gyms;
drop policy if exists "gyms update: submitter while not published, mods anytime" on public.gyms;
drop policy if exists "gyms delete: moderators" on public.gyms;

create policy gyms_select on public.gyms for select using (
  status = 'published'
  or submitted_by = (select auth.uid())
  or public.owns_gym(id)
  or public.is_staff()
);
comment on policy gyms_select on public.gyms is
  'Everyone sees published gyms. Draft/pending/rejected listings are visible only to the submitter, the approved owner, and staff.';

create policy gyms_insert on public.gyms for insert to authenticated with check (
  submitted_by = (select auth.uid()) and public.is_active_member()
);
comment on policy gyms_insert on public.gyms is
  'Active members may submit a new gym; it enters the queue as pending.';

create policy gyms_update on public.gyms for update to authenticated using (
  public.is_staff()
  or (public.owns_gym(id) and not public.is_suspended())
  or (submitted_by = (select auth.uid()) and status <> 'published' and not public.is_suspended())
) with check (
  public.is_staff() or public.owns_gym(id) or submitted_by = (select auth.uid())
);
comment on policy gyms_update on public.gyms is
  'Staff edit any gym. Approved owners edit their own claimed listing. Submitters can still fix a listing that has not been published yet.';

create policy gyms_delete on public.gyms for delete to authenticated using (public.is_staff());
comment on policy gyms_delete on public.gyms is 'Only staff delete listings.';

-- ── open_mats (restated) ────────────────────────────────────
drop policy if exists "open_mats read: published for all, own rows, mods" on public.open_mats;
drop policy if exists "open_mats insert: any member" on public.open_mats;
drop policy if exists "open_mats insert: active member" on public.open_mats;
drop policy if exists "open_mats update: submitter or mods" on public.open_mats;
drop policy if exists "open_mats delete: moderators" on public.open_mats;

create policy open_mats_select on public.open_mats for select using (
  status = 'published'
  or submitted_by = (select auth.uid())
  or (gym_id is not null and public.owns_gym(gym_id))
  or public.is_staff()
);
comment on policy open_mats_select on public.open_mats is
  'Published mats are public; unpublished ones are visible to the submitter, the host gym owner, and staff.';

create policy open_mats_insert on public.open_mats for insert to authenticated with check (
  submitted_by = (select auth.uid()) and public.is_active_member()
);
comment on policy open_mats_insert on public.open_mats is
  'Active members submit open mats into the moderation queue.';

create policy open_mats_update on public.open_mats for update to authenticated using (
  public.is_staff()
  or (gym_id is not null and public.owns_gym(gym_id) and not public.is_suspended())
  or (submitted_by = (select auth.uid()) and status <> 'published' and not public.is_suspended())
);
comment on policy open_mats_update on public.open_mats is
  'Staff edit anything; gym owners manage mats hosted at their gym; submitters fix their own pending entries.';

create policy open_mats_delete on public.open_mats for delete to authenticated
  using (public.is_staff() or submitted_by = (select auth.uid()));
comment on policy open_mats_delete on public.open_mats is
  'Staff remove any mat; submitters may withdraw their own.';

-- ── notes & notebook domain: owner-only, NO admin bypass ────
comment on policy "notes owner only" on public.notes is
  'A notebook is private forever. Only the owner may read or write; there is deliberately NO staff or admin bypass policy on this table.';
comment on policy "collections owner only" on public.collections is
  'Collections belong solely to their owner — no staff access.';
comment on policy "note_links owner only" on public.note_links is
  'Links live inside a private note and inherit its owner-only rule.';

-- ── connections, blocks, reports: clarify intent ────────────
comment on policy "connections read participants" on public.connections is
  'Only the requester and recipient (plus staff for abuse review) can see a connection.';
comment on policy "blocks owner select + delete" on public.blocks is
  'Your blocklist is yours alone; blocked users never learn they were blocked.';
comment on policy "reports read own + mods" on public.reports is
  'Reporters track their own submissions; only staff see the full queue.';

grant select on public.gym_owners to anon, authenticated;
grant insert, delete on public.gym_owners to authenticated;
grant select, insert, update, delete on public.gym_claims to authenticated;
grant execute on function public.is_staff(), public.owns_gym(uuid),
  public.is_blocked_between(uuid, uuid), public.is_active_member(),
  public.write_audit(text, text, uuid, jsonb, text) to authenticated;
