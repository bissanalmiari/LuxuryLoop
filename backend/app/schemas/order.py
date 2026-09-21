from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class OrderItemOut(BaseModel):
    id: str
    item_id: str
    title: str
    unit_price: float
    image: str = ""


class OrderOut(BaseModel):
    id: str
    customer_name: str = ""
    branch_name: str = ""
    status: str
    channel: str
    fulfillment_type: str
    total_amount: float
    created_at: Optional[str] = None
    items: List[OrderItemOut] = []


class OrderListResponse(BaseModel):
    orders: List[OrderOut]


class CheckoutIn(BaseModel):
    fulfillment_type: str = "delivery"
    address: Optional[Dict[str, Any]] = None
    payment_method: str = "card"


class CheckoutOut(BaseModel):
    order_ids: List[str]