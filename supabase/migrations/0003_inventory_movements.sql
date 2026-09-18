-- =====================================================================
-- 0003_inventory_movements.sql
-- Day 5 — harden inventory_movements:
--   1) trigger enforces "item must currently be at from_branch_id"
--   2) RLS is branch-scoped (staff: own branch only; admin: any branch)
--      using the app.current_* bridge from 0002_rls_bridge.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) SOURCE-BRANCH ENFORCEMENT (the rule most likely to silently break)
-- ---------------------------------------------------------------------
-- The 0001 trigger relocates the item on any 'completed' row without ever
-- checking it was really at from_branch_id. A stale UI, a race between two
-- staff members, or a bad client payload could "move" an item from a
-- branch it was never at. This closes that gap.

create or replace function public.enforce_movement_source_branch()
returns trigger
language plpgsql
security definer      -- needs to read/lock `items` regardless of caller's grants
set search_path = public
as $$
declare
  v_current_branch uuid;
  v_status         public.item_status;
begin
  -- Only re-validate when this row is actually about to relocate the item.
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;
  if new.status <> 'completed' then
    return new;
  end if;

  select branch_id, status into v_current_branch, v_status
  from public.items
  where id = new.item_id
  for update;                      -- lock the item row so a concurrent transfer can't race us

  if v_current_branch is null then
    raise exception 'Item % does not exist', new.item_id;
  end if;

  if v_current_branch <> new.from_branch_id then
    raise exception
      'Item % is currently at branch %, not % — refresh and try again',
      new.item_id, v_current_branch, new.from_branch_id;
  end if;

  if v_status = 'sold' then
    raise exception 'Item % is sold and can no longer be transferred', new.item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_movement_source on public.inventory_movements;
create trigger trg_enforce_movement_source
  before insert or update on public.inventory_movements
  for each row execute function public.enforce_movement_source_branch();

-- Keep the 0001 apply-trigger's behavior, just make it SECURITY DEFINER too
-- (so app_user doesn't need a direct UPDATE grant on `items`).
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' then
    update public.items
      set branch_id = new.to_branch_id, updated_at = now()
      where id = new.item_id;
  end if;
  return new;
end;
$$;
-- trg_inventory_movement_apply from 0001 picks up this new definition automatically.

-- ---------------------------------------------------------------------
-- 2) FORCE RLS — required for it to apply to the table owner
-- ---------------------------------------------------------------------
-- Your SUPABASE_DB_URL connects as the table-owning role. Postgres skips
-- RLS for owners by default, silently no-op'ing every policy below unless
-- we force it. This is the single most important line in this file.
alter table public.inventory_movements force row level security;

-- ---------------------------------------------------------------------
-- 3) BRANCH-SCOPED RLS (replaces the old blanket staff-only policy)
-- ---------------------------------------------------------------------
drop policy if exists "inventory_movements_staff_only" on public.inventory_movements;

create policy "inventory_movements_insert_own_branch"
  on public.inventory_movements
  for insert
  with check (
    public.is_app_staff()
    and (public.is_app_admin() or from_branch_id = public.app_branch_id())
  );

create policy "inventory_movements_select_branch_scope"
  on public.inventory_movements
  for select
  using (
    public.is_app_admin()
    or from_branch_id = public.app_branch_id()
    or to_branch_id   = public.app_branch_id()
  );
-- No update/delete policy on purpose: a movement is an immutable ledger
-- entry — corrections happen by logging a new movement, not editing history.

-- ---------------------------------------------------------------------
-- 4) Grants for the app_user role (used by the RLS-connected path)
-- ---------------------------------------------------------------------
grant select, insert on public.inventory_movements to app_user;
grant select on public.users to app_user;  -- for staff-name lookups in history

-- `users` RLS (0001) is auth.uid()-based and doesn't know about this app_user
-- bridge, so add one narrow, additive read policy (existing policies still
-- apply unchanged — permissive policies OR together, this only adds access).
create policy "users_select_via_app_bridge" on public.users
  for select using (public.is_app_staff());

-- branches already has `for select using (true)` from 0001 — no change needed.

-- =====================================================================
-- END 0003
-- =====================================================================