from supabase import Client

from app.services.report_service.common import _payout_recipient_name


def list_customers(client: Client, branch_id: str | None, search: str | None = None) -> list[dict]:
    """Staff: customers transacting at their branch. Admin: everyone."""
    ids_with_orders = None
    if branch_id:
        ids_with_orders = {
            r["customer_id"]
            for r in (
                client.table("orders")
                .select("customer_id")
                .eq("branch_id", branch_id)
                .execute()
                .data
                or []
            )
            if r.get("customer_id")
        }

    q = client.table("users").select("id, email, full_name, phone, role, is_active, created_at").eq("role", "customer")
    if search:
        q = q.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%")
    users = q.execute().data or []

    out = []
    for u in users:
        if ids_with_orders is not None and u["id"] not in ids_with_orders:
            continue
        orders = (
            client.table("orders")
            .select("total_amount")
            .eq("customer_id", u["id"])
            .in_("status", ["paid", "completed"])
            .execute()
            .data
            or []
        )
        consignments = (
            client.table("authentication_requests").select("id").eq("customer_id", u["id"]).execute().data or []
        )
        out.append({
            "id": u["id"],
            "email": u.get("email") or "",
            "full_name": u.get("full_name"),
            "phone": u.get("phone"),
            "orders_count": len(orders),
            "consignments_count": len(consignments),
            "total_spent": round(sum(float(o.get("total_amount") or 0) for o in orders), 2),
            "joined_at": u.get("created_at"),
        })
    return out


def customer_history(client: Client, branch_id: str | None, customer_id: str) -> dict:
    orders_q = client.table("orders").select("*").eq("customer_id", customer_id).order("created_at", desc=True)
    if branch_id:
        orders_q = orders_q.eq("branch_id", branch_id)
    orders = []
    for o in orders_q.execute().data or []:
        branch = ""
        if o.get("branch_id"):
            b = client.table("branches").select("name").eq("id", o["branch_id"]).maybe_single().execute().data
            branch = (b or {}).get("name") or ""
        customer = client.table("users").select("full_name, email").eq("id", o["customer_id"]).maybe_single().execute().data or {}
        items = (
            client.table("order_items")
            .select("id, item_id, unit_price, items(title, item_images(file_url))")
            .eq("order_id", o["id"])
            .execute()
            .data
            or []
        )
        parsed_items = []
        payout_recipients = []
        for row in items:
            it = row.get("items") or {}
            imgs = it.get("item_images") or []
            payout_recipient = _payout_recipient_name(client, row["item_id"])
            if payout_recipient and payout_recipient not in payout_recipients:
                payout_recipients.append(payout_recipient)
            parsed_items.append({
                "id": row["id"],
                "item_id": row["item_id"],
                "title": it.get("title") or "",
                "unit_price": float(row.get("unit_price") or 0),
                "image": (imgs[0].get("file_url") if imgs else "") or "",
                "payout_recipient": payout_recipient,
            })
        orders.append({
            "id": o["id"],
            "customer_name": (customer.get("full_name") or customer.get("email") or ""),
            "branch_name": branch,
            "status": o["status"],
            "channel": o.get("channel") or "",
            "fulfillment_type": o.get("fulfillment_type") or "",
            "total_amount": float(o.get("total_amount") or 0),
            "created_at": o.get("created_at"),
            "items": parsed_items,
        })

    consignments = []
    for r in (
        client.table("authentication_requests")
        .select("*")
        .eq("customer_id", customer_id)
        .order("submitted_at", desc=True)
        .execute()
        .data
        or []
    ):
        ai = (
            client.table("ai_assessments")
            .select("confidence_score")
            .eq("request_id", r["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
            or [{}]
        )
        consignments.append({
            "id": r["id"],
            "model": r.get("model"),
            "description": r.get("description"),
            "status": r.get("status") or "submitted",
            "acquisition_intent": r.get("acquisition_intent") or "consignment",
            "confidence_score": ai[0].get("confidence_score"),
            "submitted_at": r.get("submitted_at"),
        })
    return {"orders": orders, "consignments": consignments}