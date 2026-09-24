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
    pickup_branch_name: str = ""
    status: str
    channel: str
    fulfillment_type: str
    total_amount: float
    created_at: Optional[str] = None
    items: List[OrderItemOut] = []


class OrderListResponse(BaseModel):
    orders: List[OrderOut]


class AddressIn(BaseModel):
    full_name: str = ""
    phone: str = ""
    address_line1: str = ""
    city: str = ""


class CheckoutIn(BaseModel):
    fulfillment_type: str = "delivery"
    address: Optional[AddressIn] = None
    payment_method: str = "card"
    pickup_branch_id: Optional[str] = None


class CheckoutOut(BaseModel):
    order_ids: List[str]
    checkout_url: str = ""
    checkout_session_id: str = ""
    total_amount: float = 0


class PaymentConfirmIn(BaseModel):
    checkout_session_id: str