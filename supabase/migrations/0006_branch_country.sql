-- Add country to branches so each location can show its home country.
alter table public.branches
  add column country text;