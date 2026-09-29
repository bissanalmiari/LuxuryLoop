from supabase import Client

from app.services.report_service.common import _order_split, _payout_recipient_name


def list_sales(
    client: Client,
    branch_id: str | None,
    status: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
) -> tuple[list[dict], float]:
    q = client.table("orders").select("*").order("created_at", desc=True)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    if status:
        q = q.eq("status", status)
    if from_date:
        q = q.gte("created_at", from_date)
    if to_date:
        q = q.lte("created_at", to_date)
    orders = q.execute().data or []

    sales, revenue = [], 0.0
    for o in orders:
        if o.get("status") not in ("paid", "completed"):
            continue
        branch = ""
        if o.get("branch_id"):
            b = client.table("branches").select("name").eq("id", o["branch_id"]).maybe_single().execute().data
            branch = (b or {}).get("name") or ""
        customer = client.table("users").select("full_name, email").eq("id", o["customer_id"]).maybe_single().execute().data or {}
        items = (
            client.table("order_items")
            .select("id, item_id, unit_price, items(title, ownership_type, item_images(file_url))")
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
                "ownership_type": it.get("ownership_type") or "store_owned",
            })
        total, customer_payout = _order_split(client, o["id"])
        revenue += total
        sales.append({
            "id": o["id"],
            "customer_name": (customer.get("full_name") or customer.get("email") or ""),
            "branch_name": branch,
            "status": o["status"],
            "channel": o.get("channel") or "",
            "fulfillment_type": o.get("fulfillment_type") or "",
            "total_amount": total,
            "customer_payout_total": customer_payout,
            "payout_recipients": payout_recipients,
            "created_at": o.get("created_at"),
            "items": parsed_items,
        })
    return sales, round(revenue, 2)