-- Day 12c: the customer chooses which branch they will bring the item to.
-- The appointment is scheduled at (or defaults to) this branch.

alter table public.authentication_requests
  add column if not exists preferred_branch_id uuid references public.branches(id);

create index if not exists idx_auth_requests_preferred_branch
  on public.authentication_requests(preferred_branch_id);