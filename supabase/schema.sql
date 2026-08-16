create table if not exists public.folders (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  release_year smallint check (release_year between 1888 and 2200),
  auto_name boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.folders add column if not exists release_year smallint check (release_year between 1888 and 2200);
alter table public.folders add column if not exists auto_name boolean not null default false;

create table if not exists public.share_links (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posters (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  release_year smallint check (release_year between 1888 and 2200),
  rarity text not null default 'Common' check (rarity in ('Common', 'Rare', 'Legendary')),
  quantity smallint not null default 1 check (quantity between 1 and 999),
  image_url text,
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poster_has_one_image check ((image_url is null) <> (image_path is null)),
  constraint poster_title_valid check (char_length(title) <= 60)
);

alter table public.posters add column if not exists folder_id uuid references public.folders(id) on delete set null;
alter table public.posters add column if not exists quantity smallint not null default 1 check (quantity between 1 and 999);
alter table public.posters drop constraint if exists posters_title_check;
alter table public.posters drop constraint if exists poster_title_valid;
alter table public.posters add constraint poster_title_valid check (char_length(title) <= 60);

create index if not exists folders_user_sort_idx on public.folders (user_id, sort_order);
create index if not exists posters_user_sort_idx on public.posters (user_id, sort_order);
create index if not exists posters_user_folder_sort_idx on public.posters (user_id, folder_id, sort_order);
alter table public.folders enable row level security;
alter table public.posters enable row level security;
alter table public.share_links enable row level security;
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.posters to authenticated;
grant select, insert, delete on public.share_links to authenticated;

drop policy if exists "Users manage their share link" on public.share_links;
create policy "Users manage their share link" on public.share_links for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users read their folders" on public.folders;
create policy "Users read their folders" on public.folders for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create their folders" on public.folders;
create policy "Users create their folders" on public.folders for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their folders" on public.folders;
create policy "Users update their folders" on public.folders for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their folders" on public.folders;
create policy "Users delete their folders" on public.folders for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read their posters" on public.posters;
create policy "Users read their posters" on public.posters for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create their posters" on public.posters;
create policy "Users create their posters" on public.posters for insert to authenticated
with check ((select auth.uid()) = user_id and (folder_id is null or exists (select 1 from public.folders where id=folder_id and user_id=(select auth.uid()))));

drop policy if exists "Users update their posters" on public.posters;
create policy "Users update their posters" on public.posters for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and (folder_id is null or exists (select 1 from public.folders where id=folder_id and user_id=(select auth.uid()))));

drop policy if exists "Users delete their posters" on public.posters;
create policy "Users delete their posters" on public.posters for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poster-images', 'poster-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users read their poster images" on storage.objects;
create policy "Users read their poster images" on storage.objects for select to authenticated
using (bucket_id='poster-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users upload their poster images" on storage.objects;
create policy "Users upload their poster images" on storage.objects for insert to authenticated
with check (bucket_id='poster-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users update their poster images" on storage.objects;
create policy "Users update their poster images" on storage.objects for update to authenticated
using (bucket_id='poster-images' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='poster-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users delete their poster images" on storage.objects;
create policy "Users delete their poster images" on storage.objects for delete to authenticated
using (bucket_id='poster-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
