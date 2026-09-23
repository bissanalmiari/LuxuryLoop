import httpx

from app.core.config import settings


def _customer_for_request(client, request_id: str) -> tuple[dict, str]:
    """Return (customer, title) for an authentication request, or (None, '')."""
    req = (
        client.table("authentication_requests")
        .select("customer_id, model, description, brand_id")
        .eq("id", request_id)
        .single()
        .execute()
        .data
    )
    if not req:
        return None, ""

    title = req.get("model") or req.get("description") or "your item"

    customer = (
        client.table("users")
        .select("id, full_name, email")
        .eq("id", req.get("customer_id"))
        .single()
        .execute()
        .data
    )
    return customer, title


def send_appointment_email(client, request_id: str, appointment_at: str, branch_id: str | None, notes: str | None) -> None:
    """
    Sends the customer an email confirming their physical-authentication
    appointment. Runs as a FastAPI background task after staff schedules
    it, so a downstream outage must never fail the request. Never raises.
    """
    if not settings.resend_api_key:
        return

    customer, title = _customer_for_request(client, request_id)
    if not customer or not customer.get("email"):
        return

    branch_name = ""
    if branch_id:
        b = client.table("branches").select("name").eq("id", branch_id).execute().data
        branch_name = b[0]["name"] if b else ""

    from_email = settings.email_from or "onboarding@resend.dev"
    to_email = customer["email"]

    branch = branch_name or "our nearest branch"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
      <h2 style="color:#0f3460;">Authentication appointment confirmed</h2>
      <p>Hello {customer.get('full_name') or 'there'},</p>
      <p>Good news — your consignment item <strong>{title}</strong> is ready for its
      physical authentication step.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 12px 6px 0;color:#666;">When</td>
            <td style="padding:6px 0;"><strong>{appointment_at}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#666;">Where</td>
            <td style="padding:6px 0;"><strong>{branch}</strong></td></tr>
      </table>
      <p>Please bring the item and any supporting documentation with you.</p>
      {f'<p style="color:#555;">Note from our team: {notes}</p>' if notes else ''}
      <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
        LuxuryLoop — verifying every item, piece by piece.</p>
    </div>
    """

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"LuxuryLoop <{from_email}>",
                "to": [to_email],
                "subject": f"Your authentication appointment at LuxuryLoop",
                "html": html,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
    except Exception:
        # Background task: a failed email must never break the scheduling flow.
        pass


def send_decision_email(client, request_id: str, result: str, payout_amount: float | None = None) -> None:
    """
    Informs the customer of the physical-authentication outcome.
    'authenticated' + shop_buy -> come collect your payout; consigned -> item is
    now live in the shop (paid after sale); 'rejected' -> item declined.
    Background task, never raises.
    """
    if not settings.resend_api_key:
        return

    customer, title = _customer_for_request(client, request_id)
    if not customer or not customer.get("email"):
        return

    from_email = settings.email_from or "onboarding@resend.dev"
    to_email = customer["email"]

    intent = (
        client.table("authentication_requests")
        .select("acquisition_intent")
        .eq("id", request_id)
        .single()
        .execute()
        .data
        or {}
    ).get("acquisition_intent") or "consignment"

    if result == "authenticated" and intent == "shop_buy":
        amt = payout_amount or 0.0
        subject = "We bought your item — come collect your money"
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
          <h2 style="color:#0f3460;">We bought your item</h2>
          <p>Hello {customer.get('full_name') or 'there'},</p>
          <p><strong>{title}</strong> was authenticated and the shop has bought it
          from you for <strong>{amt:,.2f} USD</strong>.</p>
          <p>Your payout is ready to collect — drop by your nearest branch with a
          valid ID to receive it.</p>
          <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
            LuxuryLoop — verifying every item, piece by piece.</p>
        </div>
        """
    elif result == "authenticated":
        listed = (
            client.table("items").select("selling_price").eq("source_request_id", request_id).limit(1).execute().data
            or []
        )
        if listed:
            price = float(listed[0]["selling_price"])
            subject = "Your item is now listed for sale"
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
              <h2 style="color:#0f3460;">Authenticated &amp; listed</h2>
              <p>Hello {customer.get('full_name') or 'there'},</p>
              <p>Great news — <strong>{title}</strong> was authenticated and is now
              live in our shop.</p>
              <p style="font-size:18px;">Listed at <strong>{price:,.2f} USD</strong></p>
              <p>You'll be paid your share once it sells — we'll email you to come
              collect your money when that happens.</p>
              <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
                LuxuryLoop — verifying every item, piece by piece.</p>
            </div>
            """
        else:
            subject = "Your item has been authenticated"
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
              <h2 style="color:#0f3460;">Authenticated</h2>
              <p>Hello {customer.get('full_name') or 'there'},</p>
              <p><strong>{title}</strong> was authenticated successfully. We'll let
              you know as soon as it's listed in the shop.</p>
              <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
                LuxuryLoop — verifying every item, piece by piece.</p>
            </div>
            """
    else:
        subject = "Update on your consignment"
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
          <h2 style="color:#0f3460;">Consignment decision</h2>
          <p>Hello {customer.get('full_name') or 'there'},</p>
          <p>Thank you for consigning <strong>{title}</strong>. After physical
          inspection, we're unable to authenticate this item, so it will not be
          listed for sale.</p>
          <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
            LuxuryLoop — verifying every item, piece by piece.</p>
        </div>
        """

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"LuxuryLoop <{from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
    except Exception:
        pass


def _user(client, user_id: str | None) -> dict:
    if not user_id:
        return {}
    u = client.table("users").select("id, full_name, email").eq("id", user_id).maybe_single().execute().data
    return u or {}


def _send_mail(from_email: str, to_email: str, subject: str, html: str) -> None:
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"LuxuryLoop <{from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
    except Exception:
        pass


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