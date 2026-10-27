-- Ảnh tiến độ: bucket PRIVATE, chỉ JPEG ≤ 2MB, đường dẫn {user_id}/{yyyy-mm-dd}/{front|side|back}.jpg.
-- Chỉ chủ sở hữu thao tác được trong thư mục của mình; xem qua signed URL ngắn hạn.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
