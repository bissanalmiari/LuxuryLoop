-- Day 9: staff decision on a physical authentication rolls the request lifecycle forward.
-- Trigger kept in the DB (existing pattern: apply_inventory_movement / release on cancel)
-- so status is advanced in one authoritative place — never two tables by hand.

create or replace function public.advance_request_on_physical_auth()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_new_status public.request_status;
begin
  if tg_op = 'UPDATE' and new.result is not distinct from old.result then
    return new; -- ignore no-op updates
  end if;

  v_new_status := case new.result
    when 'authenticated' then 'approved'::public.request_status
    when 'rejected'      then 'rejected'::public.request_status
    else null
  end;

  if v_new_status is not null then
    update public.authentication_requests
       set status       = v_new_status,
           reviewed_by  = coalesce(new.staff_id, auth.uid()),
           reviewed_at  = coalesce(new.decided_at, now()),
           review_notes = case when new.result = 'rejected'
                               then coalesce(new.notes, 'Rejected during physical authentication')
                               else coalesce(new.notes, review_notes)
                          end
     where id = new.request_id;
  end if;

  -- rejected => terminal, no downstream mutation. approved => nothing extra here;
  -- becoming sellable is owned by the order/payment triggers, not authentication.
  return new;
end;
$$;

create trigger trg_advance_request_on_physical_auth
  after insert or update of result on public.physical_authentications
  for each row execute function public.advance_request_on_physical_auth();