from fastapi import APIRouter, Depends, Query

from app.core.security import get_staff_context, StaffContext
from app.core.supabase_client import get_supabase_admin
from app.schemas.reports import (
    DashboardOut, CustomerListResponse, CustomerSummaryOut,
    CustomerHistoryOut, ConsignmentHistoryOut,
    SalesListResponse, SalesRecordOut,
)
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


def _branch(staff: StaffContext) -> str | None:
    return staff.branch_id if staff.role != "admin" else None


@router.get("/dashboard", response_model=DashboardOut)
async def get_dashboard(staff: StaffContext = Depends(get_staff_context)):
    result = report_service.dashboard(get_supabase_admin(), _branch(staff))
    return DashboardOut(**result)


@router.get("/customers", response_model=CustomerListResponse)
async def get_customers(
    search: str | None = Query(None),
    staff: StaffContext = Depends(get_staff_context),
):
    customers = report_service.list_customers(get_supabase_admin(), _branch(staff), search)
    return CustomerListResponse(
        customers=[CustomerSummaryOut(**c) for c in customers],
        total=len(customers),
    )


@router.get("/customers/{customer_id}/history", response_model=CustomerHistoryOut)
async def get_customer_history(
    customer_id: str,
    staff: StaffContext = Depends(get_staff_context),
):
    result = report_service.customer_history(get_supabase_admin(), _branch(staff), customer_id)
    return CustomerHistoryOut(
        orders=result["orders"],
        consignments=[ConsignmentHistoryOut(**c) for c in result["consignments"]],
    )


@router.get("/sales", response_model=SalesListResponse)
async def get_sales(
    status: str | None = Query(None, description="paid|completed|pending|cancelled|refunded"),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    staff: StaffContext = Depends(get_staff_context),
):
    sales, revenue = report_service.list_sales(get_supabase_admin(), _branch(staff), status, from_date, to_date)
    return SalesListResponse(
        sales=[SalesRecordOut(**s) for s in sales],
        total=len(sales),
        total_revenue=revenue,
    )