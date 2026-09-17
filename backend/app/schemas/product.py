from pydantic import BaseModel, Field
from typing import Optional, List


class ProductOut(BaseModel):
    id: str
    item_code: Optional[str] = None
    title: str
    model: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    brand_id: Optional[str] = None
    category_id: Optional[str] = None
    brand_name: str = ""
    category_name: str = ""
    branch_name: str = ""
    branch_id: str = ""
    ownership_type: str = "store_owned"
    cost: Optional[float] = None
    selling_price: float
    discount: float = 0
    image_urls: List[str] = []
    video_url: Optional[str] = None
    serial_reference: Optional[str] = None
    status: str


class ProductCreate(BaseModel):
    title: str
    model: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    branch_id: str
    cost: Optional[float] = None
    selling_price: float
    discount: float = 0
    video_url: Optional[str] = None
    serial_reference: Optional[str] = None
    image_urls: List[str] = []
    # NOTE: no ownership_type / acquisition_id here on purpose — see Day 4
    # architecture note. Manual admin creation is ALWAYS store_owned.


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    branch_id: Optional[str] = None
    selling_price: Optional[float] = None
    discount: Optional[float] = None
    video_url: Optional[str] = None
    cost: Optional[float] = None
    serial_reference: Optional[str] = None


ALLOWED_STATUS_TRANSITIONS = {
    "pending_authentication": {"available", "rejected"},
    "available": {"reserved", "sold"},
    "reserved": {"available", "sold"},
    "sold": set(),          # terminal — Week 2/order flow should be the only path here later
    "rejected": set(),      # terminal
    "transferred": {"available"},
}


class ProductStatusUpdate(BaseModel):
    status: str = Field(..., description="One of the item_status enum values")


class ProductImagesAdd(BaseModel):
    image_urls: List[str]


class ProductListResponse(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    page_size: int