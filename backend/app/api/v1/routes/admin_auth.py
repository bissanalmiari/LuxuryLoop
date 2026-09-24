from fastapi import APIRouter, Depends, HTTPException

from app.core.security import require_admin, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.schemas.auth import AdminCreateUser, AdminRoleUpdate, AdminUserResponse

router = APIRouter(prefix="/auth/admin", tags=["admin-auth"])


@router.post("/users", response_model=AdminUserResponse, status_code=201)
async def create_user(payload: AdminCreateUser, _admin: CurrentUser = Depends(require_admin)):
    client = get_supabase_admin()
    try:
        resp = client.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"full_name": payload.full_name or "", "role": payload.role},
                "app_metadata": {"role": payload.role},
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = resp.user
    return AdminUserResponse(
        id=user.id,
        email=user.email or "",
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(_admin: CurrentUser = Depends(require_admin)):
    client = get_supabase_admin()
    resp = client.table("users").select("id, email, full_name, role, is_active").execute()
    return [AdminUserResponse(**u) for u in (resp.data or [])]


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def update_role(
    user_id: str,
    payload: AdminRoleUpdate,
    _admin: CurrentUser = Depends(require_admin),
):
    client = get_supabase_admin()

    # Update auth metadata
    try:
        client.auth.admin.update_user_by_id(
            user_id,
            {
                "app_metadata": {"role": payload.role},
                "user_metadata": {"role": payload.role},
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Sync public.users
    try:
        client.table("users").update({"role": payload.role}).eq("id", user_id).execute()
    except Exception:
        pass

    resp = client.table("users").select("id, email, full_name, role, is_active").eq("id", user_id).single().execute()
    return AdminUserResponse(**(resp.data or {}))


@router.patch("/users/{user_id}/active", response_model=AdminUserResponse)
async def toggle_active(
    user_id: str,
    is_active: bool = True,
    _admin: CurrentUser = Depends(require_admin),
):
    client = get_supabase_admin()
    try:
        client.auth.admin.update_user_by_id(user_id, {"app_metadata": {"is_active": is_active}})
    except Exception:
        pass

    client.table("users").update({"is_active": is_active}).eq("id", user_id).execute()
    resp = client.table("users").select("id, email, full_name, role, is_active").eq("id", user_id).single().execute()
    return AdminUserResponse(**(resp.data or {}))


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, _admin: CurrentUser = Depends(require_admin)):
    client = get_supabase_admin()
    profile = client.table("users").select("role").eq("id", user_id).maybe_single().execute().data
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    if profile.get("role") != "customer":
        raise HTTPException(status_code=400, detail="Only customer accounts can be deleted here")
    try:
        client.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
