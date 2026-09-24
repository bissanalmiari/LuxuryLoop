from typing import Dict, List, Optional

from fastapi import HTTPException
from supabase import Client

_FULFILLMENT_OK = ("delivery", "pickup")


def _fetch_items(client: Client, order_id: str) -> List[dict]:
    rows = (
        client.table("order_items")
        .select("id, item_id, unit_price, items(title, item_images(file_url))")
        .eq("order_id", order_id)
        .execute()
    ).data or []
    items = []
    for row in rows:
        item = row.get("items") or {}
        images = item.get("item_images") or []
        items.append(
            {
                "id": row["id"],
                "item_id": row["item_id"],
                "title": item.get("title") or "",
                "unit_price": float(row["unit_price"]),
                "image": (images[0].get("file_url") if images else "") or "",
            }
        )
    return items


def _list(client: Client, customer_id: Optional[str] = None) -> List[dict]:
    q = client.table("orders").select("*").order("created_at", desc=True)
    if customer_id:
        q = q.eq("customer_id", customer_id)
    rows = q.execute().data or []

    branch_ids = {o["branch_id"] for o in rows if o.get("branch_id")}
    pickup_branch_ids = {o["pickup_branch_id"] for o in rows if o.get("pickup_branch_id")}
    branch_names = {}
    if branch_ids:
        for b in (client.table("branches").select("id, name").in_("id", list(branch_ids)).execute().data or []):
            branch_names[b["id"]] = b["name"]
    if pickup_branch_ids:
        for b in (client.table("branches").select("id, name").in_("id", list(pickup_branch_ids)).execute().data or []):
            branch_names[b["id"]] = b["name"]

    customer_ids = {o["customer_id"] for o in rows if o.get("customer_id")}
    customer_names = {}
    if customer_ids:
        for u in (client.table("users").select("id, full_name, email").in_("id", list(customer_ids)).execute().data or []):
            customer_names[u["id"]] = u.get("full_name") or u.get("email") or ""

    orders = []
    for o in rows:
        orders.append(
            {
                "id": o["id"],
                "customer_name": customer_names.get(o.get("customer_id")) or (o.get("guest_name") or ""),
                "branch_name": branch_names.get(o.get("branch_id"), ""),
                "pickup_branch_name": branch_names.get(o.get("pickup_branch_id"), "") if o.get("pickup_branch_id") else "",
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


def _cart_total(client: Client, customer_id: str, branch_ids: List[str]) -> float:
    """Sum of selling prices for the customer's cart in the given branches."""
    if not branch_ids:
        return 0.0
    rows = (
        client.table("cart_items")
        .select("items(selling_price)")
        .eq("customer_id", customer_id)
        .execute()
    ).data or []
    return float(sum(float(row.get("items", {}).get("selling_price") or 0) for row in rows))


def checkout(
    client: Client,
    customer_id: str,
    fulfillment_type: str,
    address: Optional[Dict],
    payment_method: str,
    pickup_branch_id: Optional[str] = None,
    stripe_payment_intent_id: Optional[str] = None,
) -> tuple[List[str], float]:
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

    if fulfillment_type == "pickup" and not pickup_branch_id:
        raise HTTPException(status_code=400, detail="Pickup branch is required")

    total = _cart_total(client, customer_id, branch_ids)

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
                    "p_pickup_branch_id": pickup_branch_id,
                    "p_stripe_payment_intent_id": stripe_payment_intent_id,
                },
            ).execute()
        except Exception as e:
            msg = str(e)
            if "ITEM_UNAVAILABLE" in msg:
                raise HTTPException(status_code=400, detail="One of the items is no longer available")
            raise HTTPException(status_code=400, detail=f"Checkout failed: {msg}")

        data = result.data
        if isinstance(data, str):
            order_ids.append(data)
        elif isinstance(data, list):
            order_ids.extend(d for d in data if isinstance(d, str))
        elif isinstance(data, dict):
            order_ids.extend(v for v in data.values() if isinstance(v, str))

    if not order_ids:
        raise HTTPException(status_code=400, detail="Checkout produced no orders")
    return order_ids, total


def tag_payment_intent(client: Client, order_ids: List[str], payment_intent_id: str) -> None:
    client.table("payments").update({"stripe_payment_intent_id": payment_intent_id}).in_(
        "order_id", order_ids
    ).execute()


def cancel_pending_orders(client: Client, customer_id: str, order_ids: List[str]) -> None:
    """Return unpaid checkout items to the customer's cart and remove orders."""
    orders = (
        client.table("orders")
        .select("id")
        .eq("customer_id", customer_id)
        .in_("id", order_ids)
        .eq("status", "pending")
        .execute()
        .data
        or []
    )
    valid_order_ids = [order["id"] for order in orders]
    if not valid_order_ids:
        return

    items = (
        client.table("order_items")
        .select("item_id, items(status)")
        .in_("order_id", valid_order_ids)
        .execute()
        .data
        or []
    )
    for row in items:
        item = row.get("items") or {}
        if item.get("status") == "reserved":
            client.table("items").update({"status": "available"}).eq("id", row["item_id"]).execute()
        client.table("cart_items").upsert(
            {"customer_id": customer_id, "item_id": row["item_id"]},
            on_conflict="customer_id,item_id",
            ignore_duplicates=True,
        ).execute()

    client.table("orders").delete().in_("id", valid_order_ids).execute()


def mark_payments_succeeded(client: Client, payment_intent_id: str) -> List[str]:
    """Flip 'pending' payments for an intent to 'succeeded' and mark orders paid.
    Returns the order ids."""
    rows = (
        client.table("payments")
        .select("order_id")
        .eq("stripe_payment_intent_id", payment_intent_id)
        .eq("status", "pending")
        .execute()
    ).data or []
    order_ids = [r["order_id"] for r in rows]
    if not order_ids:
        return []
    client.table("payments").update({"status": "succeeded"}).in_("order_id", order_ids).execute()
    client.table("orders").update({"status": "paid"}).in_("id", order_ids).execute()
    return order_ids