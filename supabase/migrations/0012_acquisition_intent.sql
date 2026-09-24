-- Day 12b: the customer picks the acquisition mode at submission time.
--   'shop_buy'    -> sell the item to the shop outright (staff sets payout at approval)
--   'consignment' -> list it, keep ownership, get paid on sale (commission% split)

alter table public.authentication_requests
  add column if not exists acquisition_intent text not null default 'consignment'
  check (acquisition_intent in ('shop_buy', 'consignment'));