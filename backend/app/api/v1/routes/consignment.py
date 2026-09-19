from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.schemas.consignment import ConsignmentCreate, ConsignmentOut, ConsignmentListResponse
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
    # Staff/admin can look up any consignment (needed by Day 9's review
    # queue); a customer is scoped to their own by passing their id.
    client = get_supabase_admin()
    customer_scope = user.id if user.role == "customer" else None
    result = consignment_service.get_consignment(client, consignment_id, customer_scope)
    return ConsignmentOut(**result)