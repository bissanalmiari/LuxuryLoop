from supabase import Client
from fastapi import HTTPException


def _enrich(client: Client, row: dict) -> dict:
    row["brand_name"] = ""
    row["category_name"] = ""
    row["preferred_branch_name"] = ""
    if row.get("brand_id"):
        b = client.table("brands").select("name").eq("id", row["brand_id"]).execute().data
        row["brand_name"] = b[0]["name"] if b else ""
    if row.get("category_id"):
        c = client.table("categories").select("name").eq("id", row["category_id"]).execute().data
        row["category_name"] = c[0]["name"] if c else ""
    if row.get("preferred_branch_id"):
        br = client.table("branches").select("name").eq("id", row["preferred_branch_id"]).execute().data
        row["preferred_branch_name"] = br[0]["name"] if br else ""
    docs = client.table("request_documents").select("id, document_type, file_url").eq("request_id", row["id"]).execute().data
    row["documents"] = docs or []

    ai = (
        client.table("ai_assessments")
        .select("confidence_score, supporting_indicators, suspicious_indicators, explanation, created_at")
        .eq("request_id", row["id"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    row["ai_assessment"] = ai[0] if ai else None
    return row


def create_consignment(client: Client, customer_id: str, data: dict) -> dict:
    documents = data.pop("documents", [])
    if not any(document.get("document_type") == "image" for document in documents):
        raise HTTPException(422, "At least one item photo is required")
    data["customer_id"] = customer_id
    resp = client.table("authentication_requests").insert(data).execute()
    if not resp.data:
        raise HTTPException(400, "Failed to submit consignment")
    request = resp.data[0]

    if documents:
        rows = [{"request_id": request["id"], "document_type": d["document_type"], "file_url": d["file_url"]} for d in documents]
        client.table("request_documents").insert(rows).execute()

    return _enrich(client, request)


def get_consignment(client: Client, request_id: str, customer_id: str | None) -> dict:
    resp = client.table("authentication_requests").select("*").eq("id", request_id).single().execute()
    if not resp.data:
        raise HTTPException(404, "Consignment request not found")
    row = resp.data
    if customer_id and row["customer_id"] != customer_id:
        raise HTTPException(404, "Consignment request not found")
    return _enrich(client, row)


def list_my_consignments(client: Client, customer_id: str) -> list[dict]:
    resp = (
        client.table("authentication_requests")
        .select("*")
        .eq("customer_id", customer_id)
        .order("submitted_at", desc=True)
        .execute()
    )
    return [_enrich(client, row) for row in (resp.data or [])]

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
    import logging

    try:
        promote_approved_consignment(client, request_id, branch_id, selling_price, payout_amount, commission_pct)
    except Exception as e:
        logging.getLogger("luxuryloop.consignment").exception("promote failed for request %s", request_id)


def list_staff_queue(client):
    """
    Rooted on authentication_requests (not physical_authentications) so an
    item shows up the moment it's submitted + AI-screened — not only after
    staff has scheduled an appointment. ai_assessments and
    physical_authentications are both fetched separately per request,
    since a request may have neither, one, or both.
    """
    requests = (
        client.table("authentication_requests")
        .select("id, status, acquisition_intent, preferred_branch_id, model, description, customer_id, submitted_at, customer:users!authentication_requests_customer_id_fkey(full_name)")
        .in_("status", ["submitted", "under_review", "pending_physical_authentication"])
        .order("submitted_at", desc=True)
        .execute()
    )

    preferred_branch_names = {}
    preferred_branch_ids = {req["preferred_branch_id"] for req in (requests.data or []) if req.get("preferred_branch_id")}
    if preferred_branch_ids:
        pref_rows = (
            client.table("branches")
            .select("id, name")
            .in_("id", list(preferred_branch_ids))
            .execute()
            .data
            or []
        )
        preferred_branch_names = {b["id"]: b["name"] for b in pref_rows}

    out = []
    for req in requests.data or []:
        cust = req.get("customer") or {}

        ai_rows = (
            client.table("ai_assessments")
            .select("confidence_score, supporting_indicators, suspicious_indicators, explanation, created_at")
            .eq("request_id", req["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
        ai = ai_rows[0] if ai_rows else {}

        pa_rows = (
            client.table("physical_authentications")
            .select("id, branch_id, branch:branches(name), appointment_at, result, notes, decided_at")
            .eq("request_id", req["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
        pa = pa_rows[0] if pa_rows else {}
        branch = pa.get("branch") or {}

        out.append({
            "id": pa.get("id") or req["id"],  # no appointment yet -> key on the request itself
            "request_id": req["id"],
            "status": req.get("status"),
            "acquisition_intent": req.get("acquisition_intent") or "consignment",
            "preferred_branch_id": req.get("preferred_branch_id"),
            "preferred_branch_name": preferred_branch_names.get(req.get("preferred_branch_id")) if req.get("preferred_branch_id") else None,
            "notes": pa.get("notes"),
            "appointment_at": pa.get("appointment_at"),
            "decided_at": pa.get("decided_at"),
            "branch_name": branch.get("name"),
            "customer_id": req.get("customer_id"),
            "customer_name": cust.get("full_name"),
            "title": req.get("model") or req.get("description") or "Untitled",
            "confidence_score": ai.get("confidence_score"),
            "supporting_indicators": ai.get("supporting_indicators") or [],
            "suspicious_indicators": ai.get("suspicious_indicators") or [],
            "explanation": ai.get("explanation"),
        })
    return out
def run_ai_screening(client, request_id: str) -> None:
    """
    Runs as a FastAPI background task (plain sync function -> dispatched to
    a threadpool, so asyncio.run() here is safe — no event loop already
    running in that thread). Never raises: a failed AI call must never
    leave a submission stuck, so on any error we insert a fallback
    assessment instead and let the trigger route it to manual review.
    """
    import asyncio
    from app.services import ai_service

    request = client.table("authentication_requests").select("*").eq("id", request_id).single().execute().data
    if not request:
        return

    brand_name = ""
    if request.get("brand_id"):
        b = client.table("brands").select("name").eq("id", request["brand_id"]).execute().data
        brand_name = b[0]["name"] if b else ""
    category_name = ""
    if request.get("category_id"):
        c = client.table("categories").select("name").eq("id", request["category_id"]).execute().data
        category_name = c[0]["name"] if c else ""

    image_urls = [
        d["file_url"]
        for d in client.table("request_documents").select("file_url, document_type").eq("request_id", request_id).execute().data or []
        if d["document_type"] == "image"
    ]

    try:
        result = asyncio.run(ai_service.screen_consignment(brand_name, category_name, request.get("model"), image_urls))
        client.table("ai_assessments").insert({
            "request_id": request_id,
            "confidence_score": result["confidence_score"],
            "supporting_indicators": result["supporting_indicators"],
            "suspicious_indicators": result["suspicious_indicators"],
            "explanation": result["explanation"],
            "model_used": "gemini-vision",
            "raw_response": result["raw_response"],
        }).execute()
    except Exception as e:
        try:
            client.table("ai_assessments").insert({
                "request_id": request_id,
                "confidence_score": None,
                "supporting_indicators": [],
                "suspicious_indicators": [],
                "explanation": f"AI screening unavailable ({e}). Flagged for manual review.",
                "model_used": "fallback",
            }).execute()
        except Exception:
            # A transient database transport failure must not escape a background task.
            pass