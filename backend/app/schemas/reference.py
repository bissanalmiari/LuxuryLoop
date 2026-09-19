from typing import Optional
from pydantic import BaseModel


# ---- Branches -----------------------------------------------------------
class BranchBase(BaseModel):
    name: str
    address: str
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class BranchOut(BranchBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ---- Categories ---------------------------------------------------------
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None


# ---- Brands --------------------------------------------------------------
class BrandBase(BaseModel):
    name: str
    description: Optional[str] = None


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class BrandOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None