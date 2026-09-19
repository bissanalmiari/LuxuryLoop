from typing import Dict, List, Optional

from fastapi import HTTPException
from supabase import Client

_FULFILLMENT_OK = ("delivery", "pickup")


def _fetch_items(client: Client, order_id: str) -> List[dict]:
    rows = (
        client.table("order_items")
        .select("id, item_id, unit_price, items(title)")
        .eq("order_id", order_id)
        .execute()
    ).data or []
    items = []
    for row in rows:
        item = row.get("items") or {}
        items.append(
            {
                "id": row["id"],
                "item_id": row["item_id"],
                "title": item.get("title") or "",
                "unit_price": float(row["unit_price"]),
            }
        )
    return items


def _list(client: Client, customer_id: Optional[str] = None) -> List[dict]:
    q = client.table("orders").select("*").order("created_at", desc=True)
    if customer_id:
        q = q.eq("customer_id", customer_id)
    rows = q.execute().data or []

    orders = []
    for o in rows:
        branch = None
        if o.get("branch_id"):
            branch = (
                client.table("branches").select("name").eq("id", o["branch_id"]).maybe_single().execute().data
            )
        customer = None
        if o.get("customer_id"):
            customer = (
                client.table("users")
                .select("full_name, email")
                .eq("id", o["customer_id"])
                .maybe_single()
                .execute()
                .data
            )
        orders.append(
            {
                "id": o["id"],
                "customer_name": (customer["full_name"] or customer["email"]) if customer else (o.get("guest_name") or ""),
                "branch_name": branch["name"] if branch else "",
                "status": o["status"],
                "channel": o["channel"],
                "fulfillment_type": o["fulfillment_type"],
                "total_amount": float(o["total_amount"]),
                "created_at": o["created_at"],
                "items": _fetch_items(client, o["id"]),
            }
        )
    return orders


def list_orders(client: Client) -> List[dict]:
    return _list(client)


def list_orders_for_customer(client: Client, customer_id: str) -> List[dict]:
    return _list(client, customer_id=customer_id)


def checkout(
    client: Client,
    customer_id: str,
    fulfillment_type: str,
    address: Optional[Dict],
    payment_method: str,
) -> List[str]:
    cart = (
        client.table("cart_items")
        .select("item_id, items(branch_id)")
        .eq("customer_id", customer_id)
        .execute()
    ).data or []

    branch_ids: List[str] = []
    for row in cart:
        item = row.get("items")
        if item and item.get("branch_id") and item["branch_id"] not in branch_ids:
            branch_ids.append(item["branch_id"])
    if not branch_ids:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    address_id = None
    if fulfillment_type == "delivery" and address:
        addr = {
            "user_id": customer_id,
            "label": "Checkout",
            "full_name": (address.get("full_name") or "").strip(),
            "phone": (address.get("phone") or "").strip(),
            "address_line1": (address.get("address_line1") or "").strip(),
            "city": (address.get("city") or "").strip(),
        }
        if not (addr["full_name"] and addr["phone"] and addr["address_line1"] and addr["city"]):
            raise HTTPException(status_code=400, detail="Shipping address is incomplete")
        address_id = client.table("addresses").insert(addr).execute().data[0]["id"]

    order_ids: List[str] = []
    for branch_id in branch_ids:
        try:
            result = client.rpc(
                "checkout_cart_for_branch",
                {
                    "p_customer_id": customer_id,
                    "p_branch_id": branch_id,
                    "p_fulfillment_type": fulfillment_type,
                    "p_address_id": address_id,
                    "p_payment_method": payment_method,
                },
            ).execute()
        except Exception as e:
            msg = str(e)
            if "ITEM_UNAVAILABLE" in msg:
                raise HTTPException(status_code=400, detail="One of the items is no longer available")
            raise HTTPException(status_code=400, detail=f"Checkout failed: {msg}")

        data = result.data
        if isinstance(data, list):
            order_ids.extend(d for d in data if isinstance(d, str))
        elif isinstance(data, dict):
            order_ids.extend(v for v in data.values() if isinstance(v, str))

    if not order_ids:
        raise HTTPException(status_code=400, detail="Checkout produced no orders")
    return order_ids