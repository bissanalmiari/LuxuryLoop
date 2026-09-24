-- Customers upload their consignment photos and docs into the public
-- 'uploads' bucket. Staff/admin stay covered by uploads_staff_write
-- (any path); customers are scoped to the two consignment folders.
create policy "customers_upload_consignment_folder"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (regexp_split_to_array(name, '/'))[1] in ('consignment-photos', 'consignment-docs')
  );