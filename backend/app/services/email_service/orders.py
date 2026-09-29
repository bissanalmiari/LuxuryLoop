from app.core.config import settings
from app.services.email_service.common import _send_mail, _user


def send_order_confirmation_email(client, order_id: str) -> None:
    """
    After a paid checkout, emails the buyer an order confirmation and, for any
    consigned item in the order, emails its original owner that it sold so they
    can come collect their payout. Runs as a FastAPI background task; never raises.
    """
    if not settings.resend_api_key:
        return

    order = (
        client.table("orders")
        .select("customer_id, branch_id, total_amount, fulfillment_type, created_at")
        .eq("id", order_id)
        .maybe_single()
        .execute()
        .data
    )
    if not order:
        return

    buyer = _user(client, order.get("customer_id"))
    if not buyer.get("email"):
        return

    branch_name = ""
    if order.get("branch_id"):
        b = client.table("branches").select("name").eq("id", order["branch_id"]).execute().data
        branch_name = b[0]["name"] if b else ""

    rows = (
        client.table("order_items")
        .select("item_id, unit_price, items(title, selling_price, ownership_type, source_request_id)")
        .eq("order_id", order_id)
        .execute()
        .data
        or []
    )

    items = []
    consigned_owners = {}
    for row in rows:
        item = row.get("items") or {}
        items.append({"title": item.get("title") or "Item", "unit_price": float(row.get("unit_price") or 0)})
        if item.get("ownership_type") == "consigned" and item.get("source_request_id"):
            src = (
                client.table("authentication_requests")
                .select("customer_id")
                .eq("id", item["source_request_id"])
                .maybe_single()
                .execute()
                .data
                or {}
            )
            owner = _user(client, src.get("customer_id"))
            if owner.get("email"):
                consigned_owners[owner["email"]] = owner

    from_email = settings.email_from or "onboarding@resend.dev"
    total = float(order.get("total_amount") or 0)
    fulfillment = (order.get("fulfillment_type") or "pickup").capitalize()

    lines = "".join(
        f"<tr><td style='padding:6px 0;'>{it['title']}</td>"
        f"<td style='padding:6px 0;text-align:right;'>{it['unit_price']:,.2f} USD</td></tr>"
        for it in items
    )

    buyer_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
      <h2 style="color:#0f3460;">Payment received — thank you</h2>
      <p>Hello {buyer.get('full_name') or 'there'},</p>
      <p>Your payment has been received and your order is confirmed.</p>
      <table style="border-collapse:collapse;margin:16px 0;width:100%;">
        <tr style="border-bottom:1px solid #eee;"><th style="padding:6px 0;text-align:left;color:#666;">Item</th>
            <th style="padding:6px 0;text-align:right;color:#666;">Price</th></tr>
        {lines}
        <tr><td style="padding:8px 0;font-weight:bold;">Total</td>
            <td style="padding:8px 0;text-align:right;font-weight:bold;">{total:,.2f} USD</td></tr>
      </table>
      <p>Order #{order_id[:8].upper()} · Collection: <strong>{fulfillment}</strong>
      {f'at our <strong>{branch_name}</strong> branch' if branch_name else ''}</p>
      {f'<p>You can track it under Orders in your account.</p>'}
      <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
        LuxuryLoop — verifying every item, piece by piece.</p>
    </div>
    """
    _send_mail(from_email, buyer["email"], f"Order #{order_id[:8].upper()} confirmed — LuxuryLoop", buyer_html)

    for owner_email, owner in consigned_owners.items():
        seller_html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
          <h2 style="color:#0f3460;">Your item sold</h2>
          <p>Hello {owner.get('full_name') or 'there'},</p>
          <p>Great news — a consigned item of yours, <strong>{items[0]['title'] if items else 'your item'}</strong>,
          has been sold in our shop.</p>
          <p>Your payout from the sale is ready. Drop by your nearest branch with a
          valid ID to collect it.</p>
          <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
            LuxuryLoop — verifying every item, piece by piece.</p>
        </div>
        """
        _send_mail(from_email, owner_email, "Your consigned item sold — come collect your payout", seller_html)