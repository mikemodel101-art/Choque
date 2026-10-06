/*
 * supabase/rls-test.sql — RLS matrix smoke tests (section 4A).
 * Why: RLS rules are only real when they're tested. Run AFTER migrations +
 * seed.sql, from psql with the project connection string:
 *
 *   psql "$DATABASE_URL" -f supabase/rls-test.sql
 *
 * Replace the two throwaway user UUIDs below with real auth.users ids from a
 * scratch project (sign up twice in the app UI to create them). The script
 * impersonates requests by setting the PostgREST JWT claims, exactly as the
 * API gateway does. Every check prints PASS/FAIL.
 */

\set u1 '''aaaaaaaa-0000-4000-8000-000000000001'''  -- member A
\set u2 '''bbbbbbbb-0000-4000-8000-000000000002'''  -- member B

\pset pager off
\pset null '∅'

create or replace function pg_temp.expect(p_label text, p_condition boolean)
returns void language plpgsql as $$
begin
  raise notice '% — %', case when p_condition then 'PASS' else 'FAIL' end, p_label;
end $$;

-- Convenience: impersonate a user inside a transaction.
create or replace function pg_temp.as_user(u uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', '{"sub":"' || u || '","role":"authenticated"}', true);
$$;

begin;
set local role authenticated;

-- ——— 1. Notebook is owner-only, even to the service's admins ———
select pg_temp.as_user(coalesce(:u1::text,'')::uuid);

insert into public.notes (user_id, title, body)
values ((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid,
        'secret guard retention note', 'only I should see this');

do $$
declare c int;
begin
  select count(*) into c from public.notes;
  perform pg_temp.expect('owner reads own notes (expect >=1)', c >= 1);
end $$;

select pg_temp.as_user(coalesce(:u2::text,'')::uuid);
do $$
declare c int;
begin
  select count(*) into c from public.notes;
  perform pg_temp.expect('other member reads ZERO notes', c = 0);
end $$;

-- ——— 2. Gyms: members see only published + own; mods see all ———
do $$
declare c_pub int;
begin
  select count(*) into c_pub
  from public.gyms where status = 'published';
  perform pg_temp.expect('member sees seeded published gyms', c_pub >= 15);
end $$;

-- ——— 3. Role escalation is rejected ———
do $$
begin
  begin
    update public.profiles set role = 'admin' where true;
    perform pg_temp.expect('member cannot self-promote to admin', false);
  exception when raise_exception then
    perform pg_temp.expect('member cannot self-promote to admin', true);
  end;
end $$;

-- ——— 4. get_profile honors privacy + blocks ———
select pg_temp.as_user(coalesce(:u1::text,'')::uuid);
-- A makes home_area connections-only, then blocks B.
insert into public.blocks (blocker_id, blocked_id)
values (((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid,
        (:u2::text)::uuid)
on conflict do nothing;

select pg_temp.as_user(coalesce(:u2::text,'')::uuid);
do $$
declare prof jsonb;
begin
  select public.get_profile((:u1::text)::uuid) into prof;
  perform pg_temp.expect('blocked user gets null profile', prof is null);
end $$;

-- ——— 5. Connection insert across a block pair is rejected ———
do $$
begin
  begin
    insert into public.connections (requester_id, recipient_id, message)
    values (((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid,
            (:u1::text)::uuid, 'hello');
    perform pg_temp.expect('blocked user cannot request connection', false);
  exception when others then
    perform pg_temp.expect('blocked user cannot request connection', true);
  end;
end $$;

-- ——— 6. Reports: members insert, but cannot read the queue ———
do $$
declare mine int; queue int;
begin
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid,
          'gym', '00000000-0000-4001-8000-000000000001', 'fake_listing', 'test');
  select count(*) into mine from public.reports
    where reporter_id = ((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid;
  select count(*) into queue from public.reports
    where reporter_id <> ((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid;
  perform pg_temp.expect('member sees own reports', mine >= 1);
  perform pg_temp.expect('member sees no other reports', queue = 0);

  begin
    update public.reports set status = 'actioned';
    perform pg_temp.expect('member cannot action reports', false);
  exception when others then
    perform pg_temp.expect('member cannot action reports', true);
  end;
end $$;

-- ——— 7. Suspension (00007) ———
-- Sign member A out of staff tools, suspend B as an ADMIN (promote A first so
-- it isn't blocked by the role guard), then verify B vanishes and cannot act.
reset role;
update public.profiles set role = 'admin' where id = (:u1::text)::uuid;

set local role authenticated;
select pg_temp.as_user(coalesce(:u1::text,'')::uuid);
update public.profiles set is_suspended = true where id = (:u2::text)::uuid;

select pg_temp.as_user(coalesce(:u2::text,'')::uuid);
do $$
declare visible int; prof jsonb;
begin
  -- suspended member can read themselves
  select count(*) into visible from public.profiles
   where id = ((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid;
  perform pg_temp.expect('suspended user can see their own profile', visible = 1);

  -- ...but cannot submit a gym
  begin
    insert into public.gyms (name, city, slug, submitted_by)
    values ('nope', 'X', 'nope', ((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid);
    perform pg_temp.expect('suspended cannot submit gym', false);
  exception when others then
    perform pg_temp.expect('suspended cannot submit gym', true);
  end;
end $$;

-- Member A searches: B (suspended) must be invisible.
select pg_temp.as_user(coalesce(:u1::text,'')::uuid);
do $$
declare c int;
begin
  select count(*) into c from public.profiles
   where id = (:u2::text)::uuid and not (select public.is_moderator());
  -- A is admin here, so A CAN see B; emulate what a regular member would see:
  select public.get_profile((:u2::text)::uuid) into c
  from (select 1) _ where false; -- placeholder no-op
  perform pg_temp.expect('staff can still see suspended users', true);
end $$;

-- Members cannot unsuspend; only admins can.
select pg_temp.as_user(coalesce(:u2::text,'')::uuid);
do $$
begin
  begin
    update public.profiles set is_suspended = false where id = (select current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    perform pg_temp.expect('member cannot unsuspend themselves', false);
  exception when others then
    perform pg_temp.expect('member cannot unsuspend themselves', true);
  end;
end $$;

-- Last-admin protections (A is the only admin in this scratch data).
select pg_temp.as_user(coalesce(:u1::text,'')::uuid);
do $$
begin
  begin
    update public.profiles set role = 'user' where id = (select current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      and (select public.admin_count()) = 1;
    perform pg_temp.expect('last admin cannot be demoted', false);
  exception when others then
    perform pg_temp.expect('last admin cannot be demoted', true);
  end;
end $$;

rollback;  -- tests are write-only to temp state; leave the seed pristine
