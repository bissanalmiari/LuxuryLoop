from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.schemas.auth import UserProfile, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser = Depends(get_current_user)):
    client = get_supabase_admin()
    try:
        resp = client.table("users").select("*").eq("id", user.id).single().execute()
    except Exception:
        # Fallback to JWT-decoded data
        return UserProfile(
            id=user.id,
            email=user.email or "",
            role=user.role,
        )

    profile = resp.data
    return UserProfile(
        id=profile.get("id", user.id),
        email=profile.get("email", user.email or ""),
        full_name=profile.get("full_name"),
        phone=profile.get("phone"),
        role=profile.get("role", user.role),
        branch_id=profile.get("branch_id"),
        is_active=profile.get("is_active", True),
    )


@router.patch("/me", response_model=UserProfile)
async def update_me(
    payload: UserUpdate,
    user: CurrentUser = Depends(get_current_user),
):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        resp = client.table("users").update(data).eq("id", user.id).execute()
        profile = resp.data[0] if resp.data else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update profile")

    return UserProfile(
        id=profile.get("id", user.id),
        email=profile.get("email", user.email or ""),
        full_name=profile.get("full_name"),
        phone=profile.get("phone"),
        role=profile.get("role", user.role),
        branch_id=profile.get("branch_id"),
        is_active=profile.get("is_active", True),
    )
