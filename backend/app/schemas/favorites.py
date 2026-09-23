from typing import List, Optional
from pydantic import BaseModel


class FavoriteItemOut(BaseModel):
    id: str               # favorites.id
    item_id: str
    title: str
    brand_name: str = ""
    branch_name: str = ""
    selling_price: float = 0.0
    status: str = "available"
    image_url: Optional[str] = None
    created_at: Optional[str] = None


class FavoriteItemAdd(BaseModel):
    item_id: str


class FavoriteListResponse(BaseModel):
    favorites: List[FavoriteItemOut]