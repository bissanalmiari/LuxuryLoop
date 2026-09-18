from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_staff_context, StaffContext
from app.core.db import rls_connection
from app.schemas.inventory import MovementCreate, MovementOut
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/movements", response_model=MovementOut, status_code=201)
async def create_movement(
    payload: MovementCreate,
    staff: StaffContext = Depends(get_staff_context),
    conn=Depends(rls_connection),
):
    # Fast, friendly failure before Postgres even sees it. RLS re-checks this
    # server-side regardless (inventory_movements_insert_own_branch) — this
    # is a nicer error message, not the only line of defense.
    if staff.role != "admin" and staff.branch_id != payload.from_branch_id:
        raise HTTPException(status_code=403, detail="You can only transfer items out of your own branch")

    movement = inventory_service.create_movement(
        conn,
        item_id=payload.item_id,
        from_branch_id=payload.from_branch_id,
        to_branch_id=payload.to_branch_id,
        staff_id=staff.id,
        notes=payload.notes,
    )
    return MovementOut(**movement)


@router.get("/items/{item_id}/movements", response_model=list[MovementOut])
async def get_item_movement_history(
    item_id: str,
    staff: StaffContext = Depends(get_staff_context),
    conn=Depends(rls_connection),
):
    movements = inventory_service.list_movements_for_item(conn, item_id)
    return [MovementOut(**m) for m in movements]