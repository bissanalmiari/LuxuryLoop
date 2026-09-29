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


def _user(client, user_id: str | None) -> dict:
    if not user_id:
        return {}
    u = client.table("users").select("id, full_name, email").eq("id", user_id).maybe_single().execute().data
    return u or {}


def _send_mail(from_email: str, to_email: str, subject: str, html: str) -> None:
    import logging

    if not settings.resend_api_key:
        return
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
        # Background task: a failed email must never break the flow.
        logging.getLogger("luxuryloop.email").exception("email send failed (to=%s, subject=%s)", to_email, subject)