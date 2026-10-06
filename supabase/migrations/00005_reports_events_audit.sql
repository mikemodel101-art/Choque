/*
 * 00005_reports_events_audit.sql — trust & safety plus analytics.
 * Reports: members report profiles / gyms / open mats; only moderators and
 * admins see the queue and can action it. Submitters get a read-only view of
 * their own submissions. Events: a server-side analytics table clients POST
 * to via insert_only RPC. Audit log: an append-only record of everything a
 * moderator or admin does to a row they don't own.
 */

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  target_id   uuid not null,
  reason      public.report_reason not null,
  details     text not null default '' check (char_length(details) <= 2000),
  status      public.report_status not null default 'open',
  handled_by  uuid references public.profiles (id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

create policy "reports insert by any member" on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- You can see your own submissions; mods/admins see the full queue.
create policy "reports read own + mods" on public.reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or (select public.is_moderator())
  );

create policy "reports update mods only" on public.reports for update
  to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create or replace function public.reports_stamp_handled()
returns trigger language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.handled_by := (select auth.uid());
    new.handled_at := now();
  end if;
  return new;
end $$;

create trigger reports_stamp_handled
  before update on public.reports
  for each row execute function public.reports_stamp_handled();

-- ——— Events (in-app analytics) ———
create table public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles (id) on delete set null,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  path       text not null default '',
  created_at timestamptz not null default now()
);

create index events_name_idx on public.events (name, created_at desc);
create index events_created_idx on public.events (created_at desc);

alter table public.events enable row level security;

-- Insert-only for clients (user_id is forced to auth.uid()); read: mods.
create policy "events insert self or null" on public.events for insert
  to authenticated
  with check (user_id = (select auth.uid()) or user_id is null);

create policy "events read moderators" on public.events for select
  to authenticated
  using ((select public.is_moderator()));

-- ——— Audit log (append-only) ———
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,            -- 'update' | 'delete' | 'role_change' | 'status_change'
  entity     text not null,            -- table name
  entity_id  uuid,
  diff       jsonb,                    -- {"col": [old, new], ...} or null
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- No client writes. Only service_role (via the API route with the admin
-- client) inserts. Mods can read.
create policy "audit read moderators" on public.audit_log for select
  to authenticated
  using ((select public.is_moderator()));

-- Trigger: auto-audit moderator/admin mutations on content they don't own.
create or replace function public.audit_moderated_rows()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  diff jsonb;
begin
  if not public.is_moderator() then
    return coalesce(new, old);
  end if;
  diff := '{}'::jsonb;
  if tg_op = 'UPDATE' then
    diff := (
      select coalesce(jsonb_object_agg(key, jsonb_build_array(o, n)), '{}'::jsonb)
      from (
        select key, to_jsonb(old) -> key as o, to_jsonb(new) -> key as n
        from jsonb_object_keys(to_jsonb(new)) key
        where (to_jsonb(old) -> key) is distinct from (to_jsonb(new) -> key)
      ) changes
    );
    insert into public.audit_log (actor_id, action, entity, entity_id, diff)
    values ((select auth.uid()), 'update', tg_table_name,
            coalesce((to_jsonb(new) ->> 'id')::uuid, null), diff);
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (actor_id, action, entity, entity_id, diff)
    values ((select auth.uid()), 'delete', tg_table_name,
            coalesce((to_jsonb(old) ->> 'id')::uuid, null), to_jsonb(old));
  end if;
  return coalesce(new, old);
end $$;

create trigger gyms_audit
  after update or delete on public.gyms
  for each row execute function public.audit_moderated_rows();

create trigger open_mats_audit
  after update or delete on public.open_mats
  for each row execute function public.audit_moderated_rows();

create trigger reports_audit
  after update on public.reports
  for each row execute function public.audit_moderated_rows();

grant select, insert, update on public.reports to authenticated;
grant insert on public.events to authenticated;
grant select on public.audit_log to authenticated;
