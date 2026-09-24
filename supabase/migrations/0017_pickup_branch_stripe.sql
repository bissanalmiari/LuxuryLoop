-- Pickup branches + Stripe: customers pick which branch to collect from,
-- and payments move from "always succeeds inline" to a real Stripe
-- PaymentIntent that stays "pending" until the gateway confirms it.

alter table public.orders
  add column if not exists pickup_branch_id uuid references public.branches(id);

alter table public.payments
  add column if not exists stripe_payment_intent_id text;

-- One atomic checkout for ONE branch's worth of a customer's cart.
-- Called once per branch present in the cart (see order_service.py).
-- The payment is left 'pending' and tagged with the Stripe PaymentIntent id;
-- the frontend confirms the card with Stripe, then POSTs /orders/confirm-payment
-- which flips the payment to 'succeeded' (trigger marks items sold + order paid).
create or replace function public.checkout_cart_for_branch(
  p_customer_id uuid,
  p_branch_id uuid,
  p_fulfillment_type public.fulfillment_type,
  p_address_id uuid,
  p_payment_method text,
  p_pickup_branch_id uuid default null,
  p_stripe_payment_intent_id text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_row record;
begin
  insert into public.orders (customer_id, branch_id, channel, fulfillment_type, address_id, pickup_branch_id, status, total_amount)
  values (p_customer_id, p_branch_id, 'online', p_fulfillment_type, p_address_id, p_pickup_branch_id, 'pending', 0)
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

  insert into public.payments (order_id, amount, status, payment_method, currency, stripe_payment_intent_id)
  values (v_order_id, v_total, 'pending', p_payment_method, 'USD', p_stripe_payment_intent_id);

  delete from public.cart_items
    where customer_id = p_customer_id
      and item_id in (select item_id from public.order_items where order_id = v_order_id);

  return v_order_id;
end;
$$;