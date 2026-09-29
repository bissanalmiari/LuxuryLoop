from supabase import Client


def list_staff_queue(client, status: str | None = None):
    """
    Rooted on authentication_requests (not physical_authentications) so an
    item shows up the moment it's submitted + AI-screened — not only after
    staff has scheduled an appointment. ai_assessments and
    physical_authentications are both fetched separately per request,
    since a request may have neither, one, or both.

    Defaults to every request status (including approved/rejected) so a
    decided item stays visible in the queue; pass `status` to filter down
    to a single one.
    """
    query = (
        client.table("authentication_requests")
        .select("id, status, acquisition_intent, preferred_branch_id, model, description, customer_id, submitted_at, customer:users!authentication_requests_customer_id_fkey(full_name)")
    )
    if status:
        query = query.eq("status", status)
    else:
        query = query.in_("status", ["submitted", "under_review", "pending_physical_authentication", "approved", "rejected"])
    requests = query.order("submitted_at", desc=True).execute()

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