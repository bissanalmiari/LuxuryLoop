from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, require_staff
from app.core.supabase_client import get_supabase_admin
from app.schemas.newsletter import (
    NewsletterSubscribe, SubscriberListResponse, SubscriberOut,
)

router = APIRouter(prefix="/newsletter", tags=["newsletter"])


@router.post("/subscribe", status_code=201)
async def subscribe(payload: NewsletterSubscribe):
    client = get_supabase_admin()
    try:
        client.table("newsletter_subscribers").upsert(
            {"email": payload.email, "source": payload.source},
            on_conflict="email",
            ignore_duplicates=True,
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not subscribe: {e}")
    return {"ok": True, "email": payload.email}


@router.get("/subscribers", response_model=SubscriberListResponse)
async def list_subscribers(_staff: CurrentUser = Depends(require_staff)):
    client = get_supabase_admin()
    resp = client.table("newsletter_subscribers").select("*").order("created_at", desc=True).execute()
    rows = resp.data or []
    return SubscriberListResponse(
        subscribers=[SubscriberOut(**row) for row in rows],
        total=len(rows),
    )