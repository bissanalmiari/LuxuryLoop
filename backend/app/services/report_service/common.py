from datetime import datetime, timedelta, timezone

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