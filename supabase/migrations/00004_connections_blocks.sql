/*
 * 00004_connections_blocks.sql — connection requests with accepted-only
 * privacy, and the block system. Block pairs are invisible to each other in
 * search, cannot request connections, and cannot read each other's profiles.
 * A state machine trigger validates every transition (requester cancels,
 * recipient declines, recipient accepts) and stamps responded_at.
 */

-- ——— Blocks ———
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

-- You manage your own blocklist.
create policy "blocks owner insert" on public.blocks for insert
  to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks owner select + delete" on public.blocks for select
  to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks owner delete" on public.blocks for delete
  to authenticated using (blocker_id = (select auth.uid()));

-- has_blocked is defined AFTER blocks exists; 00005 swaps the policy in.
create or replace function public.has_blocked(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  ) $$;

-- ——— Connections ———
create table public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status       public.connection_status not null default 'pending',
  message      text not null default '' check (char_length(message) <= 500),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

create index connections_recipient_idx on public.connections (recipient_id, status);
create index connections_requester_idx on public.connections (requester_id, status);

alter table public.connections enable row level security;

-- Read: only the two people on the connection.
create policy "connections read participants"
  on public.connections for select
  to authenticated
  using (
    requester_id = (select auth.uid()) or recipient_id = (select auth.uid())
    or (select public.is_moderator())  -- mods audit
  );

-- Insert: sender is you, recipient exists and hasn't blocked you.
create policy "connections send"
  on public.connections for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = recipient_id
    )
    and not public.has_blocked(recipient_id, (select auth.uid()))
    and not public.has_blocked((select auth.uid()), recipient_id)
  );

-- Update: transitions only, enforced by trigger below.
create policy "connections update participants"
  on public.connections for update
  to authenticated
  using (
    requester_id = (select auth.uid()) or recipient_id = (select auth.uid())
  );

-- Are two users connected?
create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = a and recipient_id = b) or (requester_id = b and recipient_id = a))
  ) $$;

-- Connection state machine:
--   requester: pending -> cancelled (own row only)
--   recipient: pending -> declined | accepted (stamps responded_at)
--   any other field change is rejected.
create or replace function public.guard_connection_transition()
returns trigger language plpgsql
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not signed in'; end if;

  -- Only status may change (responded_at is system-stamped below).
  if new.message is distinct from old.message
     or new.requester_id is distinct from old.requester_id
     or new.recipient_id is distinct from old.recipient_id then
    raise exception 'only status can change on a connection';
  end if;

  if new.status is not distinct from old.status then
    return new; -- no-op update
  end if;

  if old.status = 'pending' and me = old.requester_id and new.status = 'cancelled' then
    new.responded_at := now();
    return new;
  end if;

  if old.status = 'pending' and me = old.recipient_id and new.status in ('declined', 'accepted') then
    new.responded_at := now();
    return new;
  end if;

  -- A declined pair may be re-requested: requester re-opens to pending.
  if old.status in ('declined', 'cancelled') and me = old.requester_id and new.status = 'pending' then
    new.responded_at := null;
    return new;
  end if;

  raise exception 'illegal connection transition % -> %', old.status, new.status;
end $$;

create trigger connections_guard_transition
  before update on public.connections
  for each row execute function public.guard_connection_transition();

grant select, insert, update, delete on public.blocks to authenticated;
grant select, insert, update on public.connections to authenticated;
grant execute on function public.has_blocked(uuid, uuid) to authenticated;
grant execute on function public.are_connected(uuid, uuid) to authenticated;
