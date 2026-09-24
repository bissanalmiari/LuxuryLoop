from fastapi import APIRouter, Depends, Query

from app.core.security import CurrentUser, require_staff
from app.core.supabase_client import get_supabase_admin
from app.schemas.consignment import StaffConsignmentOut
from app.services import consignment_service

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("/consignments", response_model=list[StaffConsignmentOut])
async def staff_consignment_queue(
    status: str | None = Query(default=None),
    user: CurrentUser = Depends(require_staff),
):
    client = get_supabase_admin()
    rows = consignment_service.list_staff_queue(client, status=status)
    return [StaffConsignmentOut(**r) for r in rows]