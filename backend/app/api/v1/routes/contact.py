from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import CurrentUser, bearer_scheme, get_current_user, require_staff
from app.core.supabase_client import get_supabase_admin
from app.schemas.contact import (
    ContactCreate, ContactListResponse, ContactOut, ContactStatusUpdate,
)

router = APIRouter(prefix="/contact", tags=["contact"])

VALID_STATUSES = ("new", "in_progress", "resolved")


async def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser | None:
    """Link the message to the logged-in user when a valid token is present."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


@router.post("", status_code=201, response_model=ContactOut)
async def submit_contact(payload: ContactCreate, user: CurrentUser | None = Depends(optional_user)):
    client = get_supabase_admin()
    row = {
        **payload.model_dump(),
        "user_id": user.id if user else None,
        "status": "new",
    }
    try:
        resp = client.table("contact_messages").insert(row).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not send message: {e}")
    if not resp.data:
        raise HTTPException(status_code=400, detail="Could not send message")
    return ContactOut(**(resp.data[0] if isinstance(resp.data, list) else resp.data))


@router.get("", response_model=ContactListResponse)
async def list_messages(
    status: str | None = None,
    _staff: CurrentUser = Depends(require_staff),
):
    if status is not None and status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status — use new, in_progress or resolved")
    client = get_supabase_admin()
    q = client.table("contact_messages").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    rows = q.execute().data or []
    return ContactListResponse(
        messages=[ContactOut(**row) for row in rows],
        total=len(rows),
    )


@router.patch("/{message_id}/status", response_model=ContactOut)
async def update_message_status(
    message_id: str,
    payload: ContactStatusUpdate,
    _staff: CurrentUser = Depends(require_staff),
):
    client = get_supabase_admin()
    resp = client.table("contact_messages").update({"status": payload.status}).eq("id", message_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Message not found")
    return ContactOut(**(resp.data[0] if isinstance(resp.data, list) else resp.data))