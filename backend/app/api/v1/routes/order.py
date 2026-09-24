from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.config import settings
from app.core.security import CurrentUser, get_current_user, get_staff_context
from app.core.supabase_client import get_supabase_admin
from app.schemas.order import CheckoutIn, CheckoutOut, OrderListResponse, OrderOut, PaymentConfirmIn
from app.services import email_service, order_service, payment_service

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_list(rows):
    return OrderListResponse(orders=[OrderOut(**o) for o in rows])


@router.get("", response_model=OrderListResponse)
async def list_orders(_staff=Depends(get_staff_context)):
    return _order_list(order_service.list_orders(get_supabase_admin()))


@router.get("/me", response_model=OrderListResponse)
async def my_orders(user: CurrentUser = Depends(get_current_user)):
    return _order_list(order_service.list_orders_for_customer(get_supabase_admin(), user.id))


@router.post("/checkout", response_model=CheckoutOut)
async def checkout(payload: CheckoutIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can checkout")
    if payload.fulfillment_type not in ("delivery", "pickup"):
        raise HTTPException(status_code=400, detail="Invalid fulfillment type")

    client = get_supabase_admin()
    order_ids, total = order_service.checkout(
        client,
        user.id,
        payload.fulfillment_type,
        payload.address.model_dump() if payload.address else None,
        payload.payment_method,
        pickup_branch_id=payload.pickup_branch_id,
    )

    success_url = f"{settings.site_url}/orders?paid=1&checkout_session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.site_url}/checkout"
    try:
        session_id, checkout_url = payment_service.create_checkout_session(
            total,
            order_ids=order_ids,
            customer_id=user.id,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))
    order_service.tag_payment_intent(client, order_ids, session_id)

    return CheckoutOut(
        order_ids=order_ids,
        checkout_url=checkout_url,
        checkout_session_id=session_id,
        total_amount=total,
    )


@router.post("/confirm-payment", response_model=CheckoutOut)
async def confirm_payment(
    payload: PaymentConfirmIn,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    if not payment_service.checkout_session_paid(payload.checkout_session_id):
        raise HTTPException(status_code=402, detail="Payment not confirmed")

    client = get_supabase_admin()
    order_ids = order_service.mark_payments_succeeded(client, payload.checkout_session_id)
    if not order_ids:
        raise HTTPException(status_code=400, detail="No pending payments found for that session")

    for order_id in order_ids:
        background_tasks.add_task(email_service.send_order_confirmation_email, client, order_id)
    return CheckoutOut(order_ids=order_ids)