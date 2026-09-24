from typing import Optional, List
from supabase import Client
from fastapi import HTTPException

from app.schemas.product import ALLOWED_STATUS_TRANSITIONS


ITEM_EMBED = "*,brands(name),categories(name),branches(name,country),item_images(file_url,sort_order)"


def _build_item_query(client: Client, filters: dict, page: int, page_size: int) -> dict:
    q = client.table("items").select(ITEM_EMBED, count="exact")

    if filters.get("category_id"):
        q = q.eq("category_id", filters["category_id"])
    if filters.get("brand_id"):
        q = q.eq("brand_id", filters["brand_id"])
    if filters.get("branch_id"):
        q = q.eq("branch_id", filters["branch_id"])
    if filters.get("status"):
        q = q.eq("status", filters["status"])
    if filters.get("min_price") is not None:
        q = q.gte("selling_price", filters["min_price"])
    if filters.get("max_price") is not None:
        q = q.lte("selling_price", filters["max_price"])
    if filters.get("search"):
        q = q.or_(f"title.ilike.%{filters['search']}%,model.ilike.%{filters['search']}%,description.ilike.%{filters['search']}%")

    offset = (page - 1) * page_size
    q = q.order("created_at", desc=True).range(offset, offset + page_size - 1)
    return q


def _get_image_urls(client: Client, item_id: str) -> List[str]:
    resp = client.table("item_images").select("file_url").eq("item_id", item_id).order("sort_order").execute()
    return [img["file_url"] for img in resp.data] if resp.data else []


def _parse_item(item: dict) -> dict:
    item = dict(item)
    brand = item.pop("brands", None) or {}
    category = item.pop("categories", None) or {}
    branch = item.pop("branches", None) or {}
    images = item.pop("item_images", None) or []
    item["brand_name"] = brand.get("name") or ""
    item["category_name"] = category.get("name") or ""
    item["branch_name"] = branch.get("name") or ""
    item["branch_country"] = branch.get("country") or ""
    item["image_urls"] = [
        img["file_url"] for img in sorted(images, key=lambda x: x.get("sort_order") or 0)
    ]
    return item


def _enrich_item(client: Client, item: dict) -> dict:
    row = item
    if not any(k in item for k in ("brands", "categories", "branches", "item_images")):
        resp = client.table("items").select(ITEM_EMBED).eq("id", item["id"]).single().execute()
        if resp.data:
            row = resp.data
    return _parse_item(row)


def _get_item_or_404(client: Client, item_id: str) -> dict:
    resp = client.table("items").select(ITEM_EMBED).eq("id", item_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return resp.data


def list_items(client: Client, **kwargs):
    page = kwargs.pop("page", 1)
    page_size = kwargs.pop("page_size", 20)
    q = _build_item_query(client, kwargs, page, page_size)
    resp = q.execute()
    items = resp.data or []
    total = resp.count or 0
    return [_enrich_item(client, item) for item in items], total


def get_item(client: Client, item_id: str) -> dict:
    return _enrich_item(client, _get_item_or_404(client, item_id))


def create_item(client: Client, data: dict) -> dict:
    """Manual admin/staff creation. Always store_owned, never tied to an acquisition."""
    image_urls = data.pop("image_urls", [])
    data["ownership_type"] = "store_owned"
    data["acquisition_id"] = None
    data.setdefault("status", "available")

    resp = client.table("items").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Failed to create item")
    item = resp.data[0]

    if image_urls:
        add_item_images(client, item["id"], image_urls)

    return _enrich_item(client, item)


def update_item(client: Client, item_id: str, data: dict) -> dict:
    existing = _get_item_or_404(client, item_id)
    data = {k: v for k, v in data.items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = client.table("items").update(data).eq("id", item_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return _enrich_item(client, resp.data[0])


def update_item_status(client: Client, item_id: str, new_status: str) -> dict:
    item = _get_item_or_404(client, item_id)
    current = item["status"]
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current, set())

    if new_status == current:
        return _enrich_item(client, item)
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move item from '{current}' to '{new_status}'. Allowed: {sorted(allowed) or 'none (terminal state)'}",
        )

    resp = client.table("items").update({"status": new_status}).eq("id", item_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Item status was not updated")
    return _enrich_item(client, resp.data[0])


def delete_item(client: Client, item_id: str):
    _get_item_or_404(client, item_id)
    resp = client.table("items").delete().eq("id", item_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return True


def add_item_images(client: Client, item_id: str, urls: List[str]) -> List[str]:
    existing_count = client.table("item_images").select("id", count="exact").eq("item_id", item_id).execute().count or 0
    rows = [
        {"item_id": item_id, "file_url": url, "sort_order": existing_count + idx}
        for idx, url in enumerate(urls)
    ]
    if rows:
        client.table("item_images").insert(rows).execute()
    return _get_image_urls(client, item_id)


def delete_item_image(client: Client, item_id: str, image_id: str):
    resp = client.table("item_images").delete().eq("id", image_id).eq("item_id", item_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Image not found on this item")


def delete_item_image_by_url(client: Client, item_id: str, image_url: str):
    resp = client.table("item_images").delete().eq("item_id", item_id).eq("file_url", image_url).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Image not found on this item")