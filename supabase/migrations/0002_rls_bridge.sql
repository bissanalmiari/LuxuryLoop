-- ============================================================================
-- 0002_rls_bridge.sql
-- pgvector extension + app_user role + RLS session-context bridge.
-- Every request carrying a JWT should set app.current_user_id / role / branch_id
-- so RLS policies can scope rows to the caller using the helper functions below.
-- ============================================================================

-- 1) pgvector (used by Week 2 AI features) ---------------------
create extension if not exists vector with schema extensions;

-- 2) app_user role ---------------------------------------------
-- Non-login role that owns RLS-friendly privileges; memberships let
-- authenticated/anon inherit exactly the grants the bridge needs.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nosuperuser nologin;
  end if;
end $$;

grant usage on schema public to app_user;
-- membership: authenticated + anon inherit app_user's grants
grant app_user to authenticated;
grant app_user to anon;

-- 3) RLS session-context functions ------------------------------
-- Security-definer RPC the backend calls once per request (inside that
-- request's transaction) to publish the caller's identity to `current_setting`.
create or replace function public.set_app_user_context(
  user_id    uuid,
  user_role  text,
  branch_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.current_user_id',   coalesce(user_id::text, ''),   true);
  perform set_config('app.current_user_role', coalesce(user_role, ''),       true);
  perform set_config('app.current_branch_id', coalesce(branch_id::text, ''), true);
end $$;

-- Read-only helpers for use inside RLS policies / queries.
create or replace function public.app_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

create or replace function public.app_user_role() returns text
language sql stable as $$
  select nullif(current_setting('app.current_user_role', true), '')
$$;

create or replace function public.app_branch_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.current_branch_id', true), '')::uuid
$$;

create or replace function public.is_app_admin() returns boolean
language sql stable as $$
  select public.app_user_role() = 'admin'
$$;

create or replace function public.is_app_staff() returns boolean
language sql stable as $$
  select public.app_user_role() in ('staff', 'admin')
$$;

-- 4) Grants -------------------------------------------------------
grant execute on function public.set_app_user_context(uuid, text, uuid) to anon, authenticated, app_user;
grant execute on function public.app_user_id() to anon, authenticated, app_user;
grant execute on function public.app_user_role() to anon, authenticated, app_user;
grant execute on function public.app_branch_id() to anon, authenticated, app_user;
grant execute on function public.is_app_admin() to anon, authenticated, app_user;
grant execute on function public.is_app_staff() to anon, authenticated, app_user;