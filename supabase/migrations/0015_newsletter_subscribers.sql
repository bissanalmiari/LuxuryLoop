-- Newsletter subscribers. Insert is public (anon); read requires staff/admin.
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text not null default 'footer',
  created_at  timestamptz not null default now(),
  unique (email)
);

alter table public.newsletter_subscribers enable row level security;

create policy newsletter_subscribers_insert_anon on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (length(email) > 3 and position('@' in email) > 1);

create policy newsletter_subscribers_admin_all on public.newsletter_subscribers
  for all to authenticated
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());