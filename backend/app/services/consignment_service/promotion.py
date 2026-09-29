"""Promotion of an authenticated consignment into a sellable listing."""

import logging

from fastapi import HTTPException
from supabase import Client

from app.services.item_service import _enrich_item, get_item

logger = logging.getLogger("luxuryloop.consignment")


def promote_approved_consignment(
    client: Client,
    request_id: str,
    branch_id: str | None,
    selling_price: float,
    payout_amount: float | None = None,
    commission_pct: float | None = None,
) -> dict:
    """
    Day 12: an authenticated consignment becomes a sellable listing.
    Honours the acquisition_intent chosen at submission:
      - shop_buy    -> shop purchases the item outright -> item is store_owned
      - consignment -> customer keeps ownership, gets a % of the sale -> consigned
    Creates the acquisitions record first, links the item to it, and to the
    request via source_request_id so a request can only be promoted once.
    """
    existing = client.table("items").select("id").eq("source_request_id", request_id).limit(1).execute()
    if existing.data:
        return get_item(client, existing.data[0]["id"])

    req = client.table("authentication_requests").select("*").eq("id", request_id).single().execute()
    if not req.data:
        raise HTTPException(404, "Consignment request not found")
    request = req.data

    intent = request.get("acquisition_intent") or "consignment"

    if not branch_id:
        # Appointment may predate branch resolution; fall back to the staff user's branch.
        pa = (
            client.table("physical_authentications")
            .select("branch_id, staff_id")
            .eq("request_id", request_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
            or [{}]
        )[0]
        branch_id = pa.get("branch_id")
        if not branch_id and pa.get("staff_id"):
            u = client.table("users").select("branch_id").eq("id", pa["staff_id"]).single().execute().data
            branch_id = (u or {}).get("branch_id")
    if not branch_id:
        raise HTTPException(400, "No branch assigned to this appointment or staff member; cannot list item")

    # Create the acquisition record that owns this item's origin.
    acq_data = {
        "request_id": request_id,
        "acquisition_type": intent,
    }
    if intent == "shop_buy":
        acq_data["payout_amount"] = payout_amount
        acq_data["cost"] = payout_amount
    else:
        acq_data["commission_pct"] = commission_pct if commission_pct is not None else 15.0
    acq = client.table("acquisitions").insert(acq_data).execute()
    if not acq.data:
        raise HTTPException(400, "Failed to record acquisition")

    brand_name = ""
    if request.get("brand_id"):
        b = client.table("brands").select("name").eq("id", request["brand_id"]).execute().data
        brand_name = b[0]["name"] if b else ""

    item = {
        "source_request_id": request_id,
        "acquisition_id": acq.data[0]["id"],
        "branch_id": branch_id,
        "category_id": request.get("category_id"),
        "brand_id": request.get("brand_id"),
        "title": " ".join(p for p in [brand_name, request.get("model")] if p) or request.get("description") or "Consigned item",
        "model": request.get("model"),
        "description": request.get("description"),
        "condition": request.get("condition"),
        "serial_reference": request.get("serial_reference"),
        "ownership_type": "store_owned" if intent == "shop_buy" else "consigned",
        "selling_price": selling_price,
        "status": "available",
    }
    resp = client.table("items").insert(item).execute()
    if not resp.data:
        raise HTTPException(400, "Failed to list item")

    images = [
        d["file_url"]
        for d in client.table("request_documents").select("file_url, document_type").eq("request_id", request_id).execute().data or []
        if d["document_type"] == "image"
    ]
    if images:
        rows = [{"item_id": resp.data[0]["id"], "file_url": url, "sort_order": idx} for idx, url in enumerate(images)]
        client.table("item_images").insert(rows).execute()

    return _enrich_item(client, resp.data[0])


def _safe_promote_approved_consignment(
    client: Client,
    request_id: str,
    branch_id: str | None,
    selling_price: float,
    payout_amount: float | None = None,
    commission_pct: float | None = None,
) -> None:
    """
    Background-task wrapper for promote_approved_consignment. Never raises:
    a listing failure must not crash the decision's HTTP response. The
    decision itself is already recorded regardless — an admin can re-open
    the request later if the listing genuinely failed.
    """
    try:
        promote_approved_consignment(client, request_id, branch_id, selling_price, payout_amount, commission_pct)
    except Exception:
        logger.exception("promote failed for request %s", request_id)