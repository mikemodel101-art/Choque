/*
 * seed_dev_users.sql — DEV ONLY role fixtures. DO NOT RUN IN PRODUCTION.
 *
 * Creates one admin, one moderator, two members and one gym owner so every
 * row of the access matrix can be exercised immediately. All rows are flagged
 * with username prefix `dev_` and email domain @choque.dev, and the strip
 * block at the bottom removes them cleanly.
 *
 * Passwords are all: choque-demo
 */

begin;

-- Supabase stores users in auth.users; we insert with a known uuid so the
-- profile trigger can attach deterministic rows.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('dddddddd-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@choque.dev',     crypt('choque-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"display_name":"Alex Yamada"}'),
  ('dddddddd-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','moderator@choque.dev', crypt('choque-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"display_name":"Jordan Fields"}'),
  ('dddddddd-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member@choque.dev',    crypt('choque-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"display_name":"Riley Tanaka"}'),
  ('dddddddd-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','suspended@choque.dev', crypt('choque-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"display_name":"Lee Mercer"}'),
  ('dddddddd-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@choque.dev',     crypt('choque-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"display_name":"Sam Ortega"}')
on conflict (id) do nothing;

-- Profiles (the auth trigger may have created shells; upsert the detail).
insert into public.profiles (id, username, display_name, home_city, belt_or_level,
                             years_training, role, is_suspended, bio)
values
  ('dddddddd-0000-4000-8000-000000000001','dev_admin',     'Alex Yamada',  'Portland','BJJ black belt', 15,'admin',    false,'DEV SEED — Shoyoroll core team.'),
  ('dddddddd-0000-4000-8000-000000000002','dev_moderator', 'Jordan Fields','Austin',  'Judo sandan',    12,'moderator',false,'DEV SEED — community moderator.'),
  ('dddddddd-0000-4000-8000-000000000003','dev_member',    'Riley Tanaka', 'Portland','BJJ blue belt',   3,'user',     false,'DEV SEED — regular member.'),
  ('dddddddd-0000-4000-8000-000000000004','dev_suspended', 'Lee Mercer',   'Brooklyn','BJJ white belt',  1,'user',     true, 'DEV SEED — suspended member.'),
  ('dddddddd-0000-4000-8000-000000000005','dev_owner',     'Sam Ortega',   'Austin',  'BJJ brown belt',  8,'user',     false,'DEV SEED — claimed gym owner.')
on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      role = excluded.role,
      is_suspended = excluded.is_suspended,
      bio = excluded.bio;

-- Make Sam the approved owner of Cinder Combat Club (from seed.sql).
insert into public.gym_owners (gym_id, user_id, approved_by)
select g.id,
       'dddddddd-0000-4000-8000-000000000005',
       'dddddddd-0000-4000-8000-000000000001'
from public.gyms g where g.slug = 'cinder-combat-club'
on conflict do nothing;

-- A pending claim so the staff queue has something to action.
insert into public.gym_claims (gym_id, user_id, message, status)
select g.id,
       'dddddddd-0000-4000-8000-000000000003',
       'DEV SEED — I run the front desk here and would like to manage this listing.',
       'pending'
from public.gyms g where g.slug = 'barton-springs-bjj'
on conflict do nothing;

commit;

/*
 * STRIP DEV USERS BEFORE LAUNCH:
 *
 * begin;
 *   delete from public.gym_claims where user_id::text like 'dddddddd-%';
 *   delete from public.gym_owners where user_id::text like 'dddddddd-%';
 *   delete from public.profiles   where username like 'dev\_%';
 *   delete from auth.users        where id::text like 'dddddddd-%';
 * commit;
 */
