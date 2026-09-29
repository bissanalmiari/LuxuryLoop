import httpx

from app.core.config import settings
from app.services.email_service.common import _customer_for_request


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
        import logging

        logging.getLogger("luxuryloop.email").exception("decision email failed for request %s", request_id)