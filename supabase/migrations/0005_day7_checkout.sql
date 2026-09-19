-- Reserve the exact instant an item is added to an order — never a batch
-- job later, so two customers can never both "win" the same unique piece.
create or replace function public.reserve_item_on_order_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status public.item_status;
begin
  select status into v_status from public.items where id = new.item_id for update;
  if v_status is null then
    raise exception 'Item % does not exist', new.item_id;
  elsif v_status <> 'available' then
    raise exception 'ITEM_UNAVAILABLE:%', new.item_id;
  end if;
  update public.items set status = 'reserved', updated_at = now() where id = new.item_id;
  return new;
end;
$$;

create trigger trg_reserve_item_on_order_item
  before insert on public.order_items
  for each row execute function public.reserve_item_on_order_item();

-- The mark-sold chain: a payment flips to 'succeeded' -> its items become
-- 'sold' -> the order becomes 'paid'. This is the one place "sold" is ever set.
create or replace function public.mark_items_sold_on_payment_success()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'succeeded' and (old.status is distinct from new.status) then
    update public.items set status = 'sold', updated_at = now()
      where id in (select item_id from public.order_items where order_id = new.order_id);
    update public.orders set status = 'paid' where id = new.order_id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger trg_mark_items_sold_on_payment_success
  after update on public.payments
  for each row execute function public.mark_items_sold_on_payment_success();

-- Cancelling an unpaid order releases its items back to the shelf.
-- Never touches an item that already made it to 'sold'.
create or replace function public.release_items_on_order_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and (old.status is distinct from new.status) then
    update public.items set status = 'available', updated_at = now()
      where id in (select item_id from public.order_items where order_id = new.id)
        and status = 'reserved';
  end if;
  return new;
end;
$$;

create trigger trg_release_items_on_order_cancelled
  after update on public.orders
  for each row execute function public.release_items_on_order_cancelled();

-- One atomic checkout for ONE branch's worth of a customer's cart.
-- Called once per branch present in the cart (see order_service.py).
-- Day 7 note: the payment is created 'pending' then flipped to 'succeeded'
-- inline — that's the "mocked" part. Swapping in a real gateway later means
-- moving just that one UPDATE into a webhook handler; the trigger chain
-- above doesn't change at all.
create or replace function public.checkout_cart_for_branch(
  p_customer_id uuid,
  p_branch_id uuid,
  p_fulfillment_type public.fulfillment_type,
  p_address_id uuid,
  p_payment_method text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_row record;
begin
  insert into public.orders (customer_id, branch_id, channel, fulfillment_type, address_id, status, total_amount)
  values (p_customer_id, p_branch_id, 'online', p_fulfillment_type, p_address_id, 'pending', 0)
  returning id into v_order_id;

  for v_row in
    select ci.item_id, i.selling_price, i.status
    from public.cart_items ci
    join public.items i on i.id = ci.item_id
    where ci.customer_id = p_customer_id and i.branch_id = p_branch_id
    for update of i
  loop
    if v_row.status <> 'available' then
      raise exception 'ITEM_UNAVAILABLE:%', v_row.item_id;
    end if;
    insert into public.order_items (order_id, item_id, unit_price) values (v_order_id, v_row.item_id, v_row.selling_price);
    v_total := v_total + v_row.selling_price;
  end loop;

  if v_total = 0 then
    raise exception 'EMPTY_CART_FOR_BRANCH';
  end if;

  update public.orders set total_amount = v_total where id = v_order_id;

  insert into public.payments (order_id, amount, status, payment_method, currency)
  values (v_order_id, v_total, 'pending', p_payment_method, 'USD');

  update public.payments set status = 'succeeded' where order_id = v_order_id;

  delete from public.cart_items
    where customer_id = p_customer_id
      and item_id in (select item_id from public.order_items where order_id = v_order_id);

  return v_order_id;
end;
$$;