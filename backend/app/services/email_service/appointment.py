import httpx

from app.core.config import settings
from app.services.email_service.common import _customer_for_request


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
        import logging

        logging.getLogger("luxuryloop.email").exception("appointment email failed for request %s", request_id)