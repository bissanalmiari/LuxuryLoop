from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user
from app.core.supabase_client import get_supabase_admin
from app.schemas.consignment import (
    ConsignmentCreate, ConsignmentOut, ConsignmentListResponse,
)
from app.schemas.physical_auth import (
    PhysicalAuthCreate, PhysicalAuthDecision, PhysicalAuthOut,
)
from app.services import consignment_service

router = APIRouter(prefix="/consignments", tags=["consignments"])


@router.post("", response_model=ConsignmentOut, status_code=201)
async def create_consignment(payload: ConsignmentCreate, user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(403, "Only customers can submit consignments")
    client = get_supabase_admin()
    result = consignment_service.create_consignment(client, user.id, payload.model_dump())
    return ConsignmentOut(**result)


@router.get("/me", response_model=ConsignmentListResponse)
async def list_my_consignments(user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(403, "Only customers have consignments")
    client = get_supabase_admin()
    rows = consignment_service.list_my_consignments(client, user.id)
    return ConsignmentListResponse(consignments=[ConsignmentOut(**c) for c in rows])


@router.get("/{consignment_id}", response_model=ConsignmentOut)
async def get_consignment(consignment_id: str, user: CurrentUser = Depends(get_current_user)):
    client = get_supabase_admin()
    customer_scope = user.id if user.role == "customer" else None
    result = consignment_service.get_consignment(client, consignment_id, customer_scope)
    return ConsignmentOut(**result)


@router.post("/{request_id}/physical-authentication", response_model=PhysicalAuthOut)
async def set_physical_auth_pending(
    request_id: str,
    payload: PhysicalAuthCreate,
    user: CurrentUser = Depends(get_current_user),
):
    if user.role not in ("staff", "admin"):
        raise HTTPException(403, "Only staff can schedule physical authentication")
    client = get_supabase_admin()
    row = {
        **payload.model_dump(exclude_none=True),
        "request_id": request_id,
        "staff_id": user.id,
        "branch_id": payload.branch_id or getattr(user, "branch_id", None),
    }
    resp = client.table("physical_authentications").insert(row).execute()
    return PhysicalAuthOut(**resp.data[0])


@router.patch("/physical-authentication/{physical_auth_id}", response_model=PhysicalAuthOut)
async def decide_physical_auth(
    physical_auth_id: str,
    payload: PhysicalAuthDecision,
    user: CurrentUser = Depends(get_current_user),
):
    if user.role not in ("staff", "admin"):
        raise HTTPException(403, "Only staff can decide")
    client = get_supabase_admin()
    data = {
        "result": payload.result,
        "notes": payload.notes,
        "decided_at": payload.decided_at or datetime.now(timezone.utc).isoformat(),
    }
    resp = client.table("physical_authentications").update(data).eq("id", physical_auth_id).execute()
    return PhysicalAuthOut(**resp.data[0])