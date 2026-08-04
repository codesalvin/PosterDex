create table if not exists public.posters (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  release_year smallint check (release_year between 1888 and 2200),
  rarity text not null default 'Common' check (rarity in ('Common', 'Rare', 'Legendary')),
  image_url text,
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poster_has_one_image check ((image_url is null) <> (image_path is null))
);

create index if not exists posters_user_sort_idx on public.posters (user_id, sort_order);
alter table public.posters enable row level security;
grant select, insert, update, delete on public.posters to authenticated;

drop policy if exists "Users read their posters" on public.posters;
create policy "Users read their posters" on public.posters for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create their posters" on public.posters;
create policy "Users create their posters" on public.posters for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their posters" on public.posters;
create policy "Users update their posters" on public.posters for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

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
