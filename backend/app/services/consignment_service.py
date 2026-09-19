from supabase import Client
from fastapi import HTTPException


def _enrich(client: Client, row: dict) -> dict:
    row["brand_name"] = ""
    row["category_name"] = ""
    if row.get("brand_id"):
        b = client.table("brands").select("name").eq("id", row["brand_id"]).execute().data
        row["brand_name"] = b[0]["name"] if b else ""
    if row.get("category_id"):
        c = client.table("categories").select("name").eq("id", row["category_id"]).execute().data
        row["category_name"] = c[0]["name"] if c else ""
    docs = client.table("request_documents").select("id, document_type, file_url").eq("request_id", row["id"]).execute().data
    row["documents"] = docs or []
    return row


def create_consignment(client: Client, customer_id: str, data: dict) -> dict:
    documents = data.pop("documents", [])
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