/*
 * 00003_notes.sql — private training notebook: notes, collections (chips),
 * note↔collection join, note links (incl. timestamped YouTube), and the
 * per-user drag-to-reorder position. STRICT OWNER-ONLY RLS: not even admins
 * can read these rows — privacy of the notebook is a product guarantee.
 */

create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null default '',
  body        text not null default '',
  position    text not null default '',     -- "half guard", "standing", "north-south"
  topic       text not null default '',     -- "sweeps", "escapes", "counters"
  -- Fractional ordering for drag-to-reorder (dnd-kit writes this back).
  sort_rank   text not null default 'n',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notes_user_idx on public.notes (user_id, sort_rank);

create table public.note_collections (
  note_id       uuid not null references public.notes (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (note_id, collection_id)
);

create table public.note_links (
  id            uuid primary key default gen_random_uuid(),
  note_id       uuid not null references public.notes (id) on delete cascade,
  url           text,
  youtube_id    text,
  title         text not null default '',
  -- Timestamped YouTube: seconds to seek to.
  start_seconds integer check (start_seconds is null or start_seconds >= 0),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  check (url is not null or youtube_id is not null)
);

create index note_links_note_idx on public.note_links (note_id);

-- ——— RLS ———
alter table public.collections enable row level security;
alter table public.notes enable row level security;
alter table public.note_collections enable row level security;
alter table public.note_links enable row level security;

-- The whole notebook domain: owner-only, no exceptions.
create policy "collections owner only" on public.collections for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notes owner only" on public.notes for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Join table: allowed only if BOTH the note and the collection belong to you.
create policy "note_collections owner only" on public.note_collections for all
  to authenticated
  using (
    exists (select 1 from public.notes n
            where n.id = note_id and n.user_id = (select auth.uid()))
    and exists (select 1 from public.collections c
            where c.id = collection_id and c.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.notes n
            where n.id = note_id and n.user_id = (select auth.uid()))
    and exists (select 1 from public.collections c
            where c.id = collection_id and c.user_id = (select auth.uid()))
  );

create policy "note_links owner only" on public.note_links for all
  to authenticated
  using (exists (select 1 from public.notes n
                 where n.id = note_id and n.user_id = (select auth.uid())))
  with check (exists (select 1 from public.notes n
                 where n.id = note_id and n.user_id = (select auth.uid())));

create trigger notes_touch_updated
  before update on public.notes
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete
  on public.collections, public.notes, public.note_collections, public.note_links
  to authenticated;
