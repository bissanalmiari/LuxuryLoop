from supabase import Client


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