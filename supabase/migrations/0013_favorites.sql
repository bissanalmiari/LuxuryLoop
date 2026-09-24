-- Day 12c bonus: wishlist. Simple two-key join table with RLS.
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

alter table public.favorites enable row level security;

create policy favorites_customer_all on public.favorites
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy favorites_staff_read on public.favorites
  for select to authenticated
  using (public.is_staff_or_admin());