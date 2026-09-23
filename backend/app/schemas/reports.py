from typing import Optional, List
from pydantic import BaseModel


class DashboardOut(BaseModel):
    total_products: int = 0
    pending_consignments: int = 0
    orders_this_week: int = 0
    revenue_this_week: float = 0.0
    customer_payout_this_week: float = 0.0
    branch_name: str = "All branches"


class CustomerSummaryOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    orders_count: int = 0
    consignments_count: int = 0
    total_spent: float = 0.0
    joined_at: Optional[str] = None


class CustomerListResponse(BaseModel):
    customers: List[CustomerSummaryOut]
    total: int


class ConsignmentHistoryOut(BaseModel):
    id: str
    model: Optional[str] = None
    description: Optional[str] = None
    status: str
    acquisition_intent: str = "consignment"
    confidence_score: Optional[float] = None
    submitted_at: Optional[str] = None


class CustomerHistoryOut(BaseModel):
    orders: List[dict] = []
    consignments: List[ConsignmentHistoryOut] = []


class SalesRecordOut(BaseModel):
    id: str
    customer_name: str = ""
    branch_name: str = ""
    status: str
    channel: str = ""
    fulfillment_type: str = ""
    total_amount: float = 0.0
    customer_payout_total: float = 0.0
    payout_recipients: List[str] = []
    created_at: Optional[str] = None
    items: List[dict] = []


class SalesListResponse(BaseModel):
    sales: List[SalesRecordOut]
    total: int
    total_revenue: float = 0.0