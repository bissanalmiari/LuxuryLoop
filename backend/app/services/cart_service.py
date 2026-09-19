from fastapi import HTTPException
from supabase import Client


def get_cart(client: Client, customer_id: str) -> dict:
    resp = (
        client.table("cart_items")
        .select("id, item_id, items(title, selling_price, status, brand_id, branch_id)")
        .eq("customer_id", customer_id)
        .execute()
    )
    items, subtotal = [], 0.0
    for row in resp.data or []:
        item = row.get("items")
        if not item:
            continue
        brand = client.table("brands").select("name").eq("id", item["brand_id"]).execute().data
        branch = client.table("branches").select("name, country").eq("id", item["branch_id"]).execute().data
        img = client.table("item_images").select("file_url").eq("item_id", row["item_id"]).order("sort_order").limit(1).execute().data
        items.append({
            "id": row["id"], "item_id": row["item_id"], "title": item["title"],
            "brand_name": brand[0]["name"] if brand else "",
            "branch_name": branch[0]["name"] if branch else "",
            "branch_country": (branch[0].get("country") or "") if branch else "",
            "selling_price": item["selling_price"],
            "image_url": img[0]["file_url"] if img else None,
            "status": item["status"],
        })
        if item["status"] == "available":
            subtotal += float(item["selling_price"])
    return {"items": items, "subtotal": subtotal}


def add_to_cart(client: Client, customer_id: str, item_id: str) -> None:
    item = client.table("items").select("status").eq("id", item_id).single().execute().data
    if not item:
        raise HTTPException(404, "Item not found")
    if item["status"] != "available":
        raise HTTPException(400, "This item is no longer available")
    try:
        client.table("cart_items").insert({"customer_id": customer_id, "item_id": item_id}).execute()
    except Exception:
        pass


def remove_from_cart(client: Client, customer_id: str, cart_item_id: str) -> None:
    client.table("cart_items").delete().eq("id", cart_item_id).eq("customer_id", customer_id).execute()