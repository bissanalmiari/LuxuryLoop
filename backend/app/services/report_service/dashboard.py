from supabase import Client

from app.services.report_service.common import _order_split, _orders_in_week, _start_of_week_utc


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