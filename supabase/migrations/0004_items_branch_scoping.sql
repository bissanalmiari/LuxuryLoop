

create or replace function public.staff_can_touch_branch(target_branch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.users
      where id = auth.uid() and role = 'staff' and branch_id = target_branch
    );
$$;

drop policy if exists "items_staff_write" on public.items;
create policy "items_staff_write" on public.items
  for all using (staff_can_touch_branch(branch_id)) with check (staff_can_touch_branch(branch_id));

drop policy if exists "item_images_staff_write" on public.item_images;
create policy "item_images_staff_write" on public.item_images
  for all
  using (exists (select 1 from public.items i where i.id = item_images.item_id and staff_can_touch_branch(i.branch_id)))
  with check (exists (select 1 from public.items i where i.id = item_images.item_id and staff_can_touch_branch(i.branch_id)));