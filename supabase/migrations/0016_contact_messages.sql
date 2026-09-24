-- Contact messages from the website. Insert is public; read/update requires staff/admin.
create type public.contact_status as enum ('new', 'in_progress', 'resolved');

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  subject     text,
  message     text not null,
  status      public.contact_status not null default 'new',
  created_at  timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy contact_messages_insert_anon on public.contact_messages
  for insert to anon, authenticated
  with check (length(name) > 0 and length(message) > 0);

create policy contact_messages_staff_all on public.contact_messages
  for all to authenticated
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());