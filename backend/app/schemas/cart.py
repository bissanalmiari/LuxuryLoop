from typing import List, Optional

from pydantic import BaseModel


class CartItemOut(BaseModel):
    id: str
    item_id: str
    title: str
    brand_name: str
    branch_name: str
    branch_country: str = ""
    selling_price: float
    image_url: Optional[str] = None
    status: str


class CartItemAdd(BaseModel):
    item_id: str


class CartResponse(BaseModel):
    items: List[CartItemOut]
    subtotal: float