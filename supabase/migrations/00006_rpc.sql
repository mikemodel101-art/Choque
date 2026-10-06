/*
 * 00006_rpc.sql — public RPC surface the app calls.
 * get_profile() resolves a profile through the caller's relationship to the
 * target, honoring per-field visibility ('public' | 'connections' |
 * 'private'), block pairs, and the accepted-only privacy rule. It is the ONE
 * read path for profile detail in the app, which keeps privacy logic out of
 * RLS policy complexity: table SELECT stays coarse, this function does the
 * fine masking. set_note_rank() persists dnd-kit reorders in one round-trip.
 */

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
  blocked := viewer is not null
             and viewer <> p.id
             and public.has_blocked(viewer, p.id);

  -- Hard invisibility for block pairs (applies to everyone except self).
  if blocked then
    return null;
  end if;

  connected := viewer is not null and public.are_connected(viewer, p.id);
  connected := connected or viewer = p.id or admin_view;

  vis := p.visibility;

  -- Which scalar fields are exposed depends on the visibility map.
  out := jsonb_build_object(
    'id', p.id,
    'username', case when coalesce(vis ->> 'username', 'public') in ('public')
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

  -- connection_state lets the UI render Connect / Pending / Connected / Blocked-by.
  out := out || jsonb_build_object(
    'connection_state',
    case
      when viewer is null then 'anonymous'
      when viewer = p.id then 'self'
      when blocked then 'blocked'
      when public.are_connected(viewer, p.id) then 'connected'
      when exists (
        select 1 from public.connections c
        where (c.requester_id = viewer and c.recipient_id = p.id and c.status = 'pending')
      ) then 'outgoing_pending'
      when exists (
        select 1 from public.connections c
        where (c.requester_id = p.id and c.recipient_id = viewer and c.status = 'pending')
      ) then 'incoming_pending'
      else 'none'
    end
  );

  -- Verification badge state travels with the profile.
  out := out || jsonb_build_object('credentials', p.credentials);

  return out;
end $$;

-- One-call reorder: dnd-kit sends the ordered id list, we rewrite sort_rank
-- keys with fractional positions.
create or replace function public.set_note_rank(p_ids uuid[])
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  i int;
begin
  for i in 1 .. array_length(p_ids, 1) loop
    update public.notes
      set sort_rank = lpad(i::text, 6, '0')
    where id = p_ids[i] and user_id = (select auth.uid());
  end loop;
end $$;

-- ——— Revisit the overly simple profile SELECT policy from 00001 ———
-- Now that has_blocked exists: non-private, non-blocked rows are listable
-- in search; field-level masking is get_profile()'s job.
drop policy if exists "profiles read own, mods, and public rows" on public.profiles;
create policy "profiles read: own, mods, or non-private non-blocked"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_moderator())
    or (
      coalesce(visibility ->> 'home_city', 'private') <> 'private'
      and not public.has_blocked((select auth.uid()), id)
    )
  );

grant execute on function public.get_profile(uuid) to anon, authenticated;
grant execute on function public.set_note_rank(uuid[]) to authenticated;
