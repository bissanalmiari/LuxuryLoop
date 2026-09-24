-- Day 10: an AI assessment landing moves the request forward automatically.
-- Same pattern as trg_advance_request_on_physical_auth — the DB is the one
-- authoritative place status changes, never two tables updated by hand.

create or replace function public.advance_request_on_ai_assessment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_current_status public.request_status;
begin
  select status into v_current_status from public.authentication_requests where id = new.request_id;

  -- Only the FIRST assessment auto-advances a fresh submission. If you ever
  -- add manual re-screening later, it shouldn't silently reopen or
  -- re-reject something staff already decided.
  if v_current_status is distinct from 'submitted' then
    return new;
  end if;

  if new.confidence_score is not null and new.confidence_score < 40 then
    update public.authentication_requests
       set status = 'rejected',
           review_notes = coalesce(review_notes, 'Auto-rejected by AI screening (confidence score below 40%).'),
           reviewed_at = now()
     where id = new.request_id;
  else
    -- score >= 40, OR the AI call failed and this is the manual-review
    -- fallback row (confidence_score is null) — either way a human looks
    -- at it next. Never gets stuck on 'submitted'.
    update public.authentication_requests
       set status = 'under_review'
     where id = new.request_id;
  end if;

  return new;
end;
$$;

create trigger trg_advance_request_on_ai_assessment
  after insert on public.ai_assessments
  for each row execute function public.advance_request_on_ai_assessment();