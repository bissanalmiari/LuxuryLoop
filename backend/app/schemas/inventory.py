from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MovementCreate(BaseModel):
    item_id: str
    from_branch_id: str  # branch the staff believes the item is currently at
    to_branch_id: str
    notes: Optional[str] = None


class MovementOut(BaseModel):
    id: str
    item_id: str
    from_branch_id: str
    from_branch_name: str = ""
    to_branch_id: str
    to_branch_name: str = ""
    moved_by_staff_id: str
    moved_by_staff_name: str = ""
    status: str
    notes: Optional[str] = None
    moved_at: datetime
    created_at: datetime