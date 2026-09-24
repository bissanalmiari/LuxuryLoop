from fastapi import HTTPException
from supabase import Client


def list_favorites(client: Client, customer_id: str) -> list[dict]:
    rows = (
        client.table("favorites")
        .select("id, created_at, item_id, items(title, selling_price, status, brand_id, branch_id)")
        .eq("user_id", customer_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    out = []
    for row in rows:
        item = row.get("items") or {}
        if not item:
            continue
        brand = client.table("brands").select("name").eq("id", item.get("brand_id")).execute().data
        branch = client.table("branches").select("name").eq("id", item.get("branch_id")).execute().data
        img = (
            client.table("item_images")
            .select("file_url")
            .eq("item_id", row["item_id"])
            .order("sort_order")
            .limit(1)
            .execute()
            .data
        )
        out.append({
            "id": row["id"],
            "item_id": row["item_id"],
            "title": item.get("title") or "Item",
            "brand_name": brand[0]["name"] if brand else "",
            "branch_name": branch[0]["name"] if branch else "",
            "selling_price": float(item.get("selling_price") or 0),
            "status": item.get("status") or "available",
            "image_url": img[0]["file_url"] if img else None,
            "created_at": row.get("created_at"),
        })
    return out


def add_favorite(client: Client, customer_id: str, item_id: str) -> None:
    item = client.table("items").select("id").eq("id", item_id).maybe_single().execute().data
    if not item:
        raise HTTPException(404, "Item not found")
    client.table("favorites").upsert(
        {"user_id": customer_id, "item_id": item_id},
        on_conflict="user_id,item_id",
        ignore_duplicates=True,
    ).execute()


def remove_favorite(client: Client, customer_id: str, item_id: str) -> None:
    client.table("favorites").delete().eq("user_id", customer_id).eq("item_id", item_id).execute()