-- Public bucket for cached Google Place photos (team menus only).
-- TEMPORARY: anon can read/write objects in this bucket for the no-auth MVP.
-- Replace with authenticated policies when Auth is added.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-place-photos',
  'menu-place-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists menu_place_photos_anon_select on storage.objects;
drop policy if exists menu_place_photos_anon_insert on storage.objects;
drop policy if exists menu_place_photos_anon_update on storage.objects;
drop policy if exists menu_place_photos_anon_delete on storage.objects;

create policy menu_place_photos_anon_select
  on storage.objects for select to anon
  using (bucket_id = 'menu-place-photos');

create policy menu_place_photos_anon_insert
  on storage.objects for insert to anon
  with check (bucket_id = 'menu-place-photos');

create policy menu_place_photos_anon_update
  on storage.objects for update to anon
  using (bucket_id = 'menu-place-photos')
  with check (bucket_id = 'menu-place-photos');

create policy menu_place_photos_anon_delete
  on storage.objects for delete to anon
  using (bucket_id = 'menu-place-photos');
