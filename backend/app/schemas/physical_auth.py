from pydantic import BaseModel, Field

class PhysicalAuthCreate(BaseModel):
    branch_id: str | None = None
    appointment_at: str | None = None
    notes: str | None = None

class PhysicalAuthDecision(BaseModel):
    result: str = Field(pattern="^(authenticated|rejected)$")
    selling_price: float | None = None
    payout_amount: float | None = None      # shop_buy: what the shop pays the customer
    commission_pct: float | None = None     # consignment: shop's % of the sale
    notes: str | None = None
    decided_at: str | None = None

class PhysicalAuthOut(BaseModel):
    id: str
    request_id: str
    branch_id: str | None
    staff_id: str | None
    appointment_at: str | None
    result: str | None
    notes: str | None
    decided_at: str | None