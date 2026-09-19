from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user, get_staff_context
from app.core.supabase_client import get_supabase_admin
from app.schemas.order import CheckoutIn, CheckoutOut, OrderListResponse, OrderOut
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=OrderListResponse)
async def list_orders(_staff=Depends(get_staff_context)):
    return OrderListResponse(
        orders=[OrderOut(**o) for o in order_service.list_orders(get_supabase_admin())]
    )


@router.get("/me", response_model=OrderListResponse)
async def my_orders(user: CurrentUser = Depends(get_current_user)):
    return OrderListResponse(
        orders=[
            OrderOut(**o)
            for o in order_service.list_orders_for_customer(get_supabase_admin(), user.id)
        ]
    )


@router.post("/checkout", response_model=CheckoutOut)
async def checkout(payload: CheckoutIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can checkout")
    if payload.fulfillment_type not in ("delivery", "pickup"):
        raise HTTPException(status_code=400, detail="Invalid fulfillment type")
    order_ids = order_service.checkout(
        get_supabase_admin(),
        user.id,
        payload.fulfillment_type,
        payload.address,
        payload.payment_method,
    )
    return CheckoutOut(order_ids=order_ids)