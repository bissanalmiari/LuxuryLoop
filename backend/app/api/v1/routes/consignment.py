from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user
from app.core.supabase_client import get_supabase_admin
from app.schemas.consignment import (
    ConsignmentCreate, ConsignmentOut, ConsignmentListResponse,
)
from app.schemas.physical_auth import (
    PhysicalAuthCreate, PhysicalAuthDecision, PhysicalAuthOut,
)
from app.services import consignment_service
from app.services import email_service

router = APIRouter(prefix="/consignments", tags=["consignments"])


def _resolve_appointment(client, physical_auth_id: str) -> dict:
    """Map a staff-queue id (pa.id ?? request.id) to the appointment row."""
    resp = (
        client.table("physical_authentications")
        .select("id, request_id, branch_id")
        .eq("id", physical_auth_id)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    resp = (
        client.table("physical_authentications")
        .select("id, request_id, branch_id")
        .eq("request_id", physical_auth_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Physical authentication not found")
    return resp.data[0]


@router.post("", response_model=ConsignmentOut, status_code=201)
async def create_consignment(payload: ConsignmentCreate,background_tasks: BackgroundTasks,  user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(403, "Only customers can submit consignments")
    client = get_supabase_admin()
    result = consignment_service.create_consignment(client, user.id, payload.model_dump())
    background_tasks.add_task(consignment_service.run_ai_screening, client, result["id"]) 
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
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    if user.role not in ("staff", "admin"):
        raise HTTPException(403, "Only staff can schedule physical authentication")
    client = get_supabase_admin()
    branch_id = payload.branch_id

    # The branch the customer chose in the consign form takes priority.
    if not branch_id:
        req = (
            client.table("authentication_requests")
            .select("preferred_branch_id")
            .eq("id", request_id)
            .single()
            .execute()
            .data
            or {}
        )
        branch_id = req.get("preferred_branch_id")

    # Last resort: the scheduling staff member's own branch.
    if not branch_id:
        branch_id = getattr(user, "branch_id", None)
        if not branch_id:
            u = client.table("users").select("branch_id").eq("id", user.id).single().execute().data
            branch_id = (u or {}).get("branch_id")
    row = {
        **payload.model_dump(exclude_none=True),
        "request_id": request_id,
        "staff_id": user.id,
        "branch_id": branch_id,
    }
    resp = client.table("physical_authentications").insert(row).execute()
    appointment = resp.data[0]
    background_tasks.add_task(
        email_service.send_appointment_email,
        client, request_id, appointment.get("appointment_at"),
        appointment.get("branch_id"),
        appointment.get("notes"),
    )
    return PhysicalAuthOut(**appointment)


@router.patch("/physical-authentication/{physical_auth_id}", response_model=PhysicalAuthOut)
async def decide_physical_auth(
    physical_auth_id: str,
    payload: PhysicalAuthDecision,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    if user.role not in ("staff", "admin"):
        raise HTTPException(403, "Only staff can decide")
    client = get_supabase_admin()

    # Resolve the appointment target: the staff queue keys on pa.id ?? request.id.
    appointment = _resolve_appointment(client, physical_auth_id)

    if payload.result == "authenticated":
        if payload.selling_price is None:
            raise HTTPException(422, "Selling price is required when approving a consignment")
        intent = (
            client.table("authentication_requests")
            .select("acquisition_intent")
            .eq("id", appointment["request_id"])
            .single()
            .execute()
            .data
            or {}
        ).get("acquisition_intent") or "consignment"
        if intent == "shop_buy" and payload.payout_amount is None:
            raise HTTPException(422, "Payout amount is required for a shop-buy")

    data = {
        "result": payload.result,
        "notes": payload.notes,
        "decided_at": payload.decided_at or datetime.now(timezone.utc).isoformat(),
    }
    resp = client.table("physical_authentications").update(data).eq("id", appointment["id"]).execute()
    if not resp.data:
        raise HTTPException(500, "Decision could not be recorded")
    appointment = resp.data[0]

    if payload.result == "authenticated":
        background_tasks.add_task(
            consignment_service._safe_promote_approved_consignment,
            client, appointment["request_id"], appointment["branch_id"],
            payload.selling_price, payload.payout_amount, payload.commission_pct,
        )
        background_tasks.add_task(
            email_service.send_decision_email, client, appointment["request_id"], "authenticated", payload.payout_amount,
        )
    else:
        background_tasks.add_task(
            email_service.send_decision_email, client, appointment["request_id"], "rejected",
        )

    return PhysicalAuthOut(**appointment)

