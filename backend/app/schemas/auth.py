from pydantic import BaseModel
from typing import Optional, Literal


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = "customer"
    branch_id: Optional[str] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


# ---- Admin role management ----------------------------------------------------


class AdminCreateUser(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Literal["customer", "staff", "admin"] = "customer"


class AdminRoleUpdate(BaseModel):
    role: Literal["customer", "staff", "admin"]


class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str = "customer"
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None