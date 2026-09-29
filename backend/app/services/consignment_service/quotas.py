from datetime import datetime, timezone

from supabase import Client


def ai_screenings_used_today(client: Client, customer_id: str) -> int:
    """Count AI screenings already queued for this customer in the current UTC day."""
    from app.core.config import settings

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    reqs = (
        client.table("authentication_requests")
        .select("id")
        .eq("customer_id", customer_id)
        .execute()
        .data
        or []
    )
    if not reqs:
        return 0
    used = (
        client.table("ai_assessments")
        .select("id")
        .in_("request_id", [r["id"] for r in reqs])
        .gte("created_at", today_start)
        .neq("model_used", "fallback")
        .execute()
        .data
        or []
    )
    return len(used)


def within_ai_screening_limit(client: Client, customer_id: str) -> bool:
    from app.core.config import settings

    limit = getattr(settings, "ai_screening_daily_limit", 10)
    return ai_screenings_used_today(client, customer_id) < limit