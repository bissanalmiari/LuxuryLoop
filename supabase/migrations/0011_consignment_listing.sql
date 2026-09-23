-- Day 12: approving a consignment promotes it into the shop (items) as a
-- consigned, sellable product. source_request_id links the listing back to
-- the authentication request (provenance + idempotency guard: a request can
-- only ever be promoted once).

alter table public.items
  add column if not exists source_request_id uuid
  references public.authentication_requests(id) on delete set null;

create index if not exists idx_items_source_request on public.items(source_request_id);