/*
 * 00002_gyms_open_mats.sql — academies and open mats + full-text search.
 * Why exists: these are the two public directory tables. Visitors can browse
 * published rows; moderators own the review queue (pending → published /
 * rejected); submitters can always see their own contributions. Search is a
 * tsvector column maintained by a trigger with GIN + trigram indexes, and a
 * paginated search_gyms() RPC the app calls.

 */

-- ——— Gyms ———
create table public.gyms (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name            text not null,
  description     text not null default '',
  address         text not null default '',
  city            text not null,
  neighborhood    text not null default '',
  region          text not null default '',   -- state / province
  country         text not null default 'US',
  lat             double precision,
  lng             double precision,
  website         text,
  instagram       text,
  email           text,
  phone           text,
  visitor_info    text not null default '',   -- what a visitor should know (drop-in, gear, etiquette)
  drop_in_fee_text text not null default '',
  schedule        jsonb not null default '[]'::jsonb,  -- [{day, time, label, style}]
  cover_image     text,
  status          public.gym_status not null default 'pending',
  status_changed_at timestamptz,
  submitted_by    uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector
);

create index gyms_city_idx on public.gyms (lower(city));
create index gyms_neighborhood_trgm_idx on public.gyms using gin (neighborhood gin_trgm_ops);
create index gyms_name_trgm_idx on public.gyms using gin (name gin_trgm_ops);
create index gyms_search_idx on public.gyms using gin (search);

-- ——— Many-to-many styles ———
create table public.gym_styles (
  gym_id   uuid not null references public.gyms (id) on delete cascade,
  style_id uuid not null references public.styles (id) on delete cascade,
  primary key (gym_id, style_id)
);

-- Keep the tsvector fresh on every write.
create or replace function public.gyms_search_trigger()
returns trigger language plpgsql
as $$
begin
  new.search :=
      setweight(to_tsvector('simple', coalesce(new.name, '')),        'A')
   || setweight(to_tsvector('simple', coalesce(new.city, '')),        'B')
   || setweight(to_tsvector('simple', coalesce(new.neighborhood, '')),'B')
   || setweight(to_tsvector('simple', coalesce(new.description, '')), 'C');
  return new;
end $$;

create trigger gyms_search_update
  before insert or update of name, city, neighborhood, description
  on public.gyms
  for each row execute function public.gyms_search_trigger();

create or replace function public.touch_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at := now(); return new; end $$;

create trigger gyms_touch_updated
  before update on public.gyms
  for each row execute function public.touch_updated_at();

-- ——— Open mats ———
create table public.open_mats (
  id                  uuid primary key default gen_random_uuid(),
  gym_id              uuid references public.gyms (id) on delete set null,
  title               text not null,
  host_name           text not null default '',
  host_contact        text not null default '',
  city                text not null,
  neighborhood        text not null default '',
  address             text not null default '',
  day_of_week         smallint not null check (day_of_week between 0 and 6),  -- 0 = Sun
  start_time          time not null,
  end_time            time not null,
  recurrence          text not null default 'weekly',  -- weekly | biweekly | monthly | one-off
  style_id            uuid references public.styles (id) on delete set null,
  visitor_requirements text not null default '',        -- gear, rank minimums, waivers
  cost_text           text not null default '',
  notes               text not null default '',
  status              public.open_mat_status not null default 'pending',
  status_changed_at   timestamptz,
  submitted_by        uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index open_mats_gym_idx on public.open_mats (gym_id);
create index open_mats_city_idx on public.open_mats (lower(city));
create index open_mats_style_idx on public.open_mats (style_id);

-- ——— RLS: gyms ———
alter table public.gyms enable row level security;
alter table public.gym_styles enable row level security;
alter table public.open_mats enable row level security;

create policy "gyms read: published for all, own rows, mods"
  on public.gyms for select
  using (
    status = 'published'
    or submitted_by = (select auth.uid())
    or (select public.is_moderator())
  );

create policy "gyms insert: any member"
  on public.gyms for insert
  to authenticated
  with check (submitted_by = (select auth.uid()));

create policy "gyms update: submitter while not published, mods anytime"
  on public.gyms for update
  using (
    submitted_by = (select auth.uid())
    or (select public.is_moderator())
  )
  with check (
    -- Only mods can publish / unpublish / reject.
    (status = 'published' and (select public.is_moderator()) is not true)
    is not true
  );

create policy "gyms delete: moderators"
  on public.gyms for delete
  using ((select public.is_moderator()));

create policy "gym_styles readable with gym"
  on public.gym_styles for select
  using (exists (select 1 from public.gyms g
                 where g.id = gym_id
                 and (g.status = 'published'
                      or g.submitted_by = (select auth.uid())
                      or (select public.is_moderator()))));

create policy "gym_styles writable with gym"
  on public.gym_styles for all
  to authenticated
  using (exists (select 1 from public.gyms g
                 where g.id = gym_id
                 and (g.submitted_by = (select auth.uid()) or (select public.is_moderator()))));

-- ——— RLS: open mats ———
create policy "open_mats read: published for all, own rows, mods"
  on public.open_mats for select
  using (
    status = 'published'
    or submitted_by = (select auth.uid())
    or (select public.is_moderator())
  );

create policy "open_mats insert: any member"
  on public.open_mats for insert
  to authenticated
  with check (submitted_by = (select auth.uid()));

create policy "open_mats update: submitter or mods"
  on public.open_mats for update
  using (
    submitted_by = (select auth.uid())
    or (select public.is_moderator())
  );

create policy "open_mats delete: moderators"
  on public.open_mats for delete
  using ((select public.is_moderator()));

create trigger open_mats_status_changed
  before update of status on public.open_mats
  for each row when (old.status is distinct from new.status)
  execute function public.touch_updated_at();

-- ——— search_gyms(): tsvector match + trigram fallback + filters + pagination ———
create or replace function public.search_gyms(
  p_query         text    default null,
  p_city          text    default null,
  p_neighborhood  text    default null,
  p_styles        text[]  default null,   -- style slugs
  p_limit         int     default 20,
  p_offset        int     default 0
)
returns table (
  gym    public.gyms,
  styles jsonb,
  rank   real,
  total  bigint
)
language sql stable security definer
set search_path = public
as $$
  with q as (select websearch_to_tsquery('simple', coalesce(p_query, '')) as ts),
  matched as (
    select g.*,
           ts_rank(g.search, q.ts)
             + greatest(similarity(g.name, coalesce(p_query,'')),
                        similarity(g.neighborhood, coalesce(p_query,'')) * 0.6) as rank
    from public.gyms g, q
    where g.status = 'published'
      and (p_query is null or p_query = ''
           or g.search @@ q.ts
           or g.name % p_query
           or g.neighborhood % p_query)
      and (p_city is null or p_city = '' or lower(g.city) = lower(p_city))
      and (p_neighborhood is null or p_neighborhood = '' or lower(g.neighborhood) = lower(p_neighborhood))
      and (p_styles is null or p_styles = '{}'
           or exists (
                select 1 from public.gym_styles gs
                join public.styles s on s.id = gs.style_id
                where gs.gym_id = g.id and s.slug = any (p_styles)
              ))
  ),
  counted as (select count(*) as total from matched)
  select m.*,
         coalesce((
           select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name))
           from public.gym_styles gs join public.styles s on s.id = gs.style_id
           where gs.gym_id = m.id
         ), '[]'::jsonb)                           as styles,
         m.rank,
         (select total from counted)                 as total
  from matched m
  order by m.rank desc, m.name asc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant select on public.gyms, public.gym_styles, public.open_mats to anon, authenticated;
grant insert, update on public.gyms, public.gym_styles, public.open_mats to authenticated;
grant execute on function public.search_gyms(text, text, text, text[], int, int) to anon, authenticated;
