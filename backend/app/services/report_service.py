from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from supabase import Client


def _start_of_week_utc() -> str:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=now.weekday())
    return start.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _orders_in_week(client: Client, branch_id: str | None, start: str) -> list[dict]:
    q = (
        client.table("orders")
        .select("id, total_amount, status")
        .gte("created_at", start)
        .in_("status", ["paid", "completed"])
    )
    if branch_id:
        q = q.eq("branch_id", branch_id)
    return q.execute().data or []


def _item_commission_split(client: Client, item_id: str, unit_price: float) -> tuple[float, float]:
    """Return (shop_share, customer_payout) for a sold item.

    Consigned inventory keeps the shop's commission percentage on the sale while
    the customer payout is tracked separately for reporting.
    """
    unit_price = float(unit_price or 0)
    item = (
        client.table("items")
        .select("ownership_type, acquisition_id")
        .eq("id", item_id)
        .maybe_single()
        .execute()
        .data
        or {}
    )
    acquisition_id = item.get("acquisition_id")
    ownership_type = item.get("ownership_type") or ""

    if not acquisition_id and ownership_type != "consigned":
        return unit_price, 0.0

    acquisition = {}
    if acquisition_id:
        acquisition = (
            client.table("acquisitions")
            .select("acquisition_type, commission_pct")
            .eq("id", acquisition_id)
            .maybe_single()
            .execute()
            .data
            or {}
        )

    if ownership_type == "consigned" or (acquisition.get("acquisition_type") == "consignment"):
        commission_pct = float(acquisition.get("commission_pct") or 15.0)
        shop_share = unit_price * (commission_pct / 100.0)
        customer_payout = unit_price - shop_share
        return round(shop_share, 2), round(customer_payout, 2)

    return unit_price, 0.0


def _order_split(client: Client, order_id: str) -> tuple[float, float]:
    rows = (
        client.table("order_items")
        .select("item_id, unit_price")
        .eq("order_id", order_id)
        .execute()
        .data
        or []
    )
    shop_total = 0.0
    customer_total = 0.0
    for row in rows:
        shop_share, customer_payout = _item_commission_split(client, row.get("item_id"), row.get("unit_price"))
        shop_total += shop_share
        customer_total += customer_payout
    return round(shop_total, 2), round(customer_total, 2)


def _payout_recipient_name(client: Client, item_id: str) -> str | None:
    item = (
        client.table("items")
        .select("ownership_type, acquisition_id, source_request_id")
        .eq("id", item_id)
        .maybe_single()
        .execute()
        .data
        or {}
    )
    if item.get("ownership_type") != "consigned":
        return None

    # Newer items link to an acquisition which links to the request; older items
    # (created before acquisitions existed) link to the request directly via
    # source_request_id. Accept either so legacy sales still show a recipient.
    request_id = None
    acquisition_id = item.get("acquisition_id")
    if acquisition_id:
        acquisition = (
            client.table("acquisitions")
            .select("request_id")
            .eq("id", acquisition_id)
            .maybe_single()
            .execute()
            .data
            or {}
        )
        request_id = acquisition.get("request_id")
    if not request_id:
        request_id = item.get("source_request_id")
    if not request_id:
        return None

    request = (
        client.table("authentication_requests")
        .select("customer_id")
        .eq("id", request_id)
        .maybe_single()
        .execute()
        .data
        or {}
    )
    customer_id = request.get("customer_id")
    if not customer_id:
        return None

    customer = (
        client.table("users")
        .select("full_name, email")
        .eq("id", customer_id)
        .maybe_single()
        .execute()
        .data
        or {}
    )
    return customer.get("full_name") or customer.get("email") or None


def dashboard(client: Client, branch_id: str | None) -> dict:
    # Products — branch-scoped exactly like the product page.
    q = client.table("items").select("id", count="exact")
    if branch_id:
        q = q.eq("branch_id", branch_id)
    total_products = q.execute().count or 0

    # Pending consignments. A request is "yours" if it has no appointment yet
    # (unclaimed pool) or its newest appointment is at your branch.
    pending = (
        client.table("authentication_requests")
        .select("id")
        .in_("status", ["submitted", "under_review"])
        .execute()
        .data
        or []
    )
    if branch_id:
        pending_count = 0
        for r in pending:
            pa = (
                client.table("physical_authentications")
                .select("branch_id")
                .eq("request_id", r["id"])
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
                or [{}]
            )
            pa_branch = pa[0].get("branch_id")
            if pa_branch is None or pa_branch == branch_id:
                pending_count += 1
    else:
        pending_count = len(pending)

    week_orders = _orders_in_week(client, branch_id, _start_of_week_utc())
    revenue = 0.0
    customer_payout = 0.0
    for order in week_orders:
        shop_share, payout = _order_split(client, order["id"])
        revenue += shop_share
        customer_payout += payout

    branch_name = "All branches"
    if branch_id:
        b = client.table("branches").select("name").eq("id", branch_id).maybe_single().execute().data
        branch_name = (b or {}).get("name") or "This branch"

    return {
        "total_products": total_products,
        "pending_consignments": pending_count,
        "orders_this_week": len(week_orders),
        "revenue_this_week": round(revenue, 2),
        "customer_payout_this_week": round(customer_payout, 2),
        "branch_name": branch_name,
    }


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