-- =====================================================================
-- LuxuryLoop — Database Schema (PostgreSQL / Supabase)
-- Item-centric lifecycle model
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
create type user_role as enum ('customer', 'staff', 'admin');

create type item_status as enum (
  'pending_authentication',
  'available',
  'reserved',
  'sold',
  'rejected',
  'transferred'
);

create type ownership_type as enum ('consigned', 'store_owned');

create type request_status as enum (
  'submitted',
  'under_review',
  'pending_physical_authentication',
  'approved',
  'rejected'
);

create type order_channel as enum ('online', 'pos');

create type order_status as enum (
  'pending',
  'paid',
  'cancelled',
  'refunded',
  'completed'
);

create type fulfillment_type as enum ('delivery', 'pickup');

create type delivery_status as enum ('not_applicable', 'processing', 'shipped', 'delivered');

create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create type document_type as enum ('image', 'invoice', 'certificate', 'other');

create type movement_status as enum ('pending', 'in_transit', 'completed', 'cancelled');

-- ---------------------------------------------------------------------
-- 2. USERS & ROLES
-- ---------------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  phone         text,
  role          user_role not null default 'customer',
  branch_id     uuid,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'App profile + role, 1:1 with auth.users. branch_id is NULL for customers and unassigned users.';

-- ---------------------------------------------------------------------
-- 3. BRANCHES
-- ---------------------------------------------------------------------
create table public.branches (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text not null,
  city         text,
  phone        text,
  email        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.users
  add constraint fk_users_branch foreign key (branch_id)
  references public.branches(id) on delete set null;

-- ---------------------------------------------------------------------
-- 3B. ADDRESSES
-- ---------------------------------------------------------------------
create table public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  label           text,
  full_name       text not null,
  phone           text not null,
  address_line1   text not null,
  address_line2   text,
  city            text not null,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_addresses_user on public.addresses(user_id);

create unique index uq_addresses_one_default_per_user
  on public.addresses(user_id)
  where is_default = true;

-- ---------------------------------------------------------------------
-- 4. CATEGORIES & BRANDS
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. AUTHENTICATION REQUESTS
-- ---------------------------------------------------------------------
create table public.authentication_requests (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.users(id) on delete cascade,
  category_id        uuid references public.categories(id),
  brand_id           uuid references public.brands(id),
  model              text,
  description        text,
  condition          text,
  serial_reference   text,
  status             request_status not null default 'submitted',
  reviewed_by        uuid references public.users(id),
  review_notes       text,
  submitted_at       timestamptz not null default now(),
  reviewed_at        timestamptz
);

create index idx_auth_requests_customer on public.authentication_requests(customer_id);
create index idx_auth_requests_status   on public.authentication_requests(status);

create table public.request_documents (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.authentication_requests(id) on delete cascade,
  document_type    document_type not null,
  file_url         text not null,
  uploaded_at      timestamptz not null default now()
);

create index idx_request_docs_request on public.request_documents(request_id);

-- ---------------------------------------------------------------------
-- 6. AI ASSESSMENTS & PHYSICAL AUTHENTICATIONS
-- ---------------------------------------------------------------------
create table public.ai_assessments (
  id                        uuid primary key default gen_random_uuid(),
  request_id                uuid not null references public.authentication_requests(id) on delete cascade,
  confidence_score          numeric(5,2) check (confidence_score between 0 and 100),
  supporting_indicators     jsonb,
  suspicious_indicators     jsonb,
  explanation               text,
  model_used                text,
  raw_response              jsonb,
  created_at                timestamptz not null default now()
);

create index idx_ai_assessments_request on public.ai_assessments(request_id);

create table public.physical_authentications (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.authentication_requests(id) on delete cascade,
  staff_id       uuid references public.users(id),
  branch_id      uuid references public.branches(id),
  appointment_at timestamptz,
  result         text,
  notes          text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_physical_auth_request on public.physical_authentications(request_id);
create index idx_physical_auth_branch  on public.physical_authentications(branch_id);

-- ---------------------------------------------------------------------
-- 6B. ACQUISITIONS
-- ---------------------------------------------------------------------
create table public.acquisitions (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid references public.authentication_requests(id),
  acquisition_type   text not null default 'consignment',
  cost               numeric(12,2),
  commission_pct     numeric(5,2),
  payout_amount      numeric(12,2),
  buyer_id           uuid references public.users(id),
  acquired_at        timestamptz not null default now()
);

create index idx_acquisitions_request on public.acquisitions(request_id);

-- ---------------------------------------------------------------------
-- 7. ITEMS (individual unique physical items)
-- ---------------------------------------------------------------------
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  item_code        text unique,
  acquisition_id   uuid references public.acquisitions(id),
  category_id      uuid references public.categories(id),
  brand_id         uuid references public.brands(id),
  branch_id        uuid not null references public.branches(id),
  title            text not null,
  model            text,
  description      text,
  condition        text,
  ownership_type   ownership_type not null default 'consigned',
  cost             numeric(12,2),
  selling_price    numeric(12,2) not null check (selling_price >= 0),
  discount         numeric(12,2) default 0 check (discount >= 0),
  video_url        text,
  status           item_status not null default 'pending_authentication',
  serial_reference text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_items_branch    on public.items(branch_id);
create index idx_items_category  on public.items(category_id);
create index idx_items_brand     on public.items(brand_id);
create index idx_items_status    on public.items(status);

create table public.item_images (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  file_url     text not null,
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

create index idx_item_images_item on public.item_images(item_id);

-- ---------------------------------------------------------------------
-- 7B. INVENTORY MOVEMENTS (branch-to-branch transfers)
-- ---------------------------------------------------------------------
create table public.inventory_movements (
  id                 uuid primary key default gen_random_uuid(),
  item_id            uuid not null references public.items(id) on delete cascade,
  from_branch_id     uuid not null references public.branches(id),
  to_branch_id       uuid not null references public.branches(id),
  moved_by_staff_id  uuid not null references public.users(id),
  moved_at           timestamptz not null default now(),
  status             movement_status not null default 'completed',
  notes              text,
  created_at         timestamptz not null default now(),
  constraint chk_movement_branches_differ check (from_branch_id <> to_branch_id)
);

create index idx_inv_moves_item        on public.inventory_movements(item_id);
create index idx_inv_moves_from_branch on public.inventory_movements(from_branch_id);
create index idx_inv_moves_to_branch   on public.inventory_movements(to_branch_id);
create index idx_inv_moves_staff       on public.inventory_movements(moved_by_staff_id);

create or replace function public.apply_inventory_movement()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' then
    update public.items set branch_id = new.to_branch_id, updated_at = now()
    where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger trg_inventory_movement_apply
  after insert or update on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ---------------------------------------------------------------------
-- 8. CART
-- ---------------------------------------------------------------------
create table public.cart_items (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.users(id) on delete cascade,
  item_id      uuid not null references public.items(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (customer_id, item_id)
);

create index idx_cart_customer on public.cart_items(customer_id);

-- ---------------------------------------------------------------------
-- 9. ORDERS (online + POS)
-- ---------------------------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid references public.users(id),
  guest_name        text,
  guest_contact     text,
  branch_id         uuid not null references public.branches(id),
  staff_id          uuid references public.users(id),
  channel           order_channel not null default 'online',
  fulfillment_type  fulfillment_type not null default 'delivery',
  address_id        uuid references public.addresses(id),
  delivery_status   delivery_status not null default 'not_applicable',
  status            order_status not null default 'pending',
  sale_price        numeric(12,2),
  discount          numeric(12,2) default 0 check (discount >= 0),
  total_amount      numeric(12,2) not null check (total_amount >= 0),
  sale_date         date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  constraint chk_order_buyer_present check (customer_id is not null or guest_name is not null),
  constraint chk_order_pos_has_staff check (channel <> 'pos' or staff_id is not null)
);

create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_branch   on public.orders(branch_id);
create index idx_orders_staff    on public.orders(staff_id);
create index idx_orders_channel  on public.orders(channel);
create index idx_orders_status   on public.orders(status);
create index idx_orders_sale_date on public.orders(sale_date);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  item_id      uuid not null references public.items(id),
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  created_at   timestamptz not null default now()
);

create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_item  on public.order_items(item_id);

-- ---------------------------------------------------------------------
-- 10. PAYMENTS
-- ---------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  amount            numeric(12,2) not null check (amount >= 0),
  status            payment_status not null default 'pending',
  payment_method    text,
  currency          text not null default 'USD',
  failed_reason     text,
  reference         text,
  payment_gateway   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_payments_order on public.payments(order_id);
create index idx_payments_status on public.payments(status);

-- ---------------------------------------------------------------------
-- 11. AI RECOMMENDER (optional stretch goal)
-- ---------------------------------------------------------------------
create table public.style_profiles (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.users(id) on delete cascade,
  category_id   uuid references public.categories(id),
  budget_min    numeric(12,2),
  budget_max    numeric(12,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_style_profiles_customer on public.style_profiles(customer_id);

create table public.recommendations (
  id                uuid primary key default gen_random_uuid(),
  style_profile_id  uuid not null references public.style_profiles(id) on delete cascade,
  item_id           uuid not null references public.items(id) on delete cascade,
  match_score       numeric(5,2),
  created_at        timestamptz not null default now()
);

create index idx_recommendations_profile on public.recommendations(style_profile_id);
create index idx_recommendations_item    on public.recommendations(item_id);

-- ---------------------------------------------------------------------
-- 12. HELPER FUNCTIONS FOR RLS
-- ---------------------------------------------------------------------
create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 13. ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.users                     enable row level security;
alter table public.branches                  enable row level security;
alter table public.addresses                 enable row level security;
alter table public.categories                enable row level security;
alter table public.brands                    enable row level security;
alter table public.authentication_requests   enable row level security;
alter table public.request_documents         enable row level security;
alter table public.ai_assessments            enable row level security;
alter table public.physical_authentications  enable row level security;
alter table public.acquisitions              enable row level security;
alter table public.items                     enable row level security;
alter table public.item_images               enable row level security;
alter table public.inventory_movements       enable row level security;
alter table public.cart_items                enable row level security;
alter table public.orders                    enable row level security;
alter table public.order_items               enable row level security;
alter table public.payments                  enable row level security;
alter table public.style_profiles            enable row level security;
alter table public.recommendations           enable row level security;

-- ---- USERS ----
create policy "users_select_own_or_staff" on public.users
  for select using (id = auth.uid() or is_staff_or_admin());
create policy "users_update_own" on public.users
  for update using (id = auth.uid());
create policy "users_admin_manage" on public.users
  for all using (is_admin());

-- ---- ADDRESSES ----
create policy "addresses_owner_manage" on public.addresses
  for all using (user_id = auth.uid());
create policy "addresses_staff_read" on public.addresses
  for select using (is_staff_or_admin());

-- ---- BRANCHES ----
create policy "branches_public_read" on public.branches
  for select using (true);
create policy "branches_admin_write" on public.branches
  for all using (is_admin());

-- ---- CATEGORIES / BRANDS ----
create policy "categories_public_read" on public.categories
  for select using (true);
create policy "categories_staff_write" on public.categories
  for all using (is_staff_or_admin());
create policy "brands_public_read" on public.brands
  for select using (true);
create policy "brands_staff_write" on public.brands
  for all using (is_staff_or_admin());

-- ---- ITEMS ----
create policy "items_public_read" on public.items
  for select using (status = 'available' or is_staff_or_admin());
create policy "items_staff_write" on public.items
  for all using (is_staff_or_admin());
create policy "item_images_public_read" on public.item_images
  for select using (true);
create policy "item_images_staff_write" on public.item_images
  for all using (is_staff_or_admin());

-- ---- INVENTORY MOVEMENTS ----
create policy "inventory_movements_staff_only" on public.inventory_movements
  for all using (is_staff_or_admin());

-- ---- AUTHENTICATION REQUESTS ----
create policy "auth_requests_customer_select_own" on public.authentication_requests
  for select using (customer_id = auth.uid() or is_staff_or_admin());
create policy "auth_requests_customer_insert_own" on public.authentication_requests
  for insert with check (customer_id = auth.uid());
create policy "auth_requests_staff_update" on public.authentication_requests
  for update using (is_staff_or_admin());

create policy "request_docs_owner_or_staff_select" on public.request_documents
  for select using (
    is_staff_or_admin() or
    exists (select 1 from public.authentication_requests r
            where r.id = request_id and r.customer_id = auth.uid())
  );
create policy "request_docs_owner_insert" on public.request_documents
  for insert with check (
    exists (select 1 from public.authentication_requests r
            where r.id = request_id and r.customer_id = auth.uid())
  );

-- ---- AI ASSESSMENTS ----
create policy "ai_assessments_staff_full" on public.ai_assessments
  for all using (is_staff_or_admin());
create policy "ai_assessments_customer_read_own" on public.ai_assessments
  for select using (
    exists (select 1 from public.authentication_requests r
            where r.id = request_id and r.customer_id = auth.uid())
  );

-- ---- PHYSICAL AUTHENTICATIONS ----
create policy "physical_auth_staff_only" on public.physical_authentications
  for all using (is_staff_or_admin());

-- ---- ACQUISITIONS ----
create policy "acquisitions_staff_only" on public.acquisitions
  for all using (is_staff_or_admin());

-- ---- CART ----
create policy "cart_customer_own" on public.cart_items
  for all using (customer_id = auth.uid());

-- ---- ORDERS ----
create policy "orders_customer_select_own" on public.orders
  for select using (customer_id = auth.uid() or is_staff_or_admin());
create policy "orders_customer_insert_own" on public.orders
  for insert with check (channel = 'online' and customer_id = auth.uid());
create policy "orders_staff_manage" on public.orders
  for all using (is_staff_or_admin());

create policy "order_items_owner_or_staff" on public.order_items
  for select using (
    is_staff_or_admin() or
    exists (select 1 from public.orders o
            where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "order_items_insert_owner_or_staff" on public.order_items
  for insert with check (
    is_staff_or_admin() or
    exists (select 1 from public.orders o
            where o.id = order_id and o.customer_id = auth.uid())
  );

-- ---- PAYMENTS ----
create policy "payments_owner_read" on public.payments
  for select using (
    is_staff_or_admin() or
    exists (select 1 from public.orders o
            where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "payments_staff_write" on public.payments
  for all using (is_staff_or_admin());

-- ---- STYLE PROFILES / RECOMMENDATIONS ----
create policy "style_profiles_owner" on public.style_profiles
  for all using (customer_id = auth.uid());
create policy "recommendations_owner_read" on public.recommendations
  for select using (
    exists (select 1 from public.style_profiles sp
            where sp.id = style_profile_id and sp.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 14. UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger trg_addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();
create trigger trg_items_updated_at before update on public.items
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger trg_style_profiles_updated_at before update on public.style_profiles
  for each row execute function public.set_updated_at();

create or replace function public.set_order_status_timestamps()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at = now();
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_orders_status_timestamps before update on public.orders
  for each row execute function public.set_order_status_timestamps();

-- ---------------------------------------------------------------------
-- 15. AUTO-CREATE USER PROFILE ON SIGNUP
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
