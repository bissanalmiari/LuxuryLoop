from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user
from app.core.supabase_client import get_supabase_admin
from app.schemas.cart import CartItemAdd, CartResponse
from app.services import cart_service


router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def view_cart(user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(403, "Only customers have a cart")
    return cart_service.get_cart(get_supabase_admin(), user.id)


@router.post("", status_code=201)
async def add_item(payload: CartItemAdd, user: CurrentUser = Depends(get_current_user)):
    if user.role != "customer":
        raise HTTPException(403, "Only customers have a cart")
    cart_service.add_to_cart(get_supabase_admin(), user.id, payload.item_id)
    return {"ok": True}


@router.delete("/{cart_item_id}", status_code=204)
async def remove_item(cart_item_id: str, user: CurrentUser = Depends(get_current_user)):
    cart_service.remove_from_cart(get_supabase_admin(), user.id, cart_item_id)
    return None