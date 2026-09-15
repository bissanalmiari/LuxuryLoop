from pydantic import BaseModel
from typing import Optional


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = "customer"
    branch_id: Optional[str] = None
    is_active: bool = True


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
