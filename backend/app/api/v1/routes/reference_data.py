from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import require_admin, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.schemas.reference import (
    BranchCreate, BranchUpdate, BranchOut,
    CategoryCreate, CategoryUpdate, CategoryOut,
    BrandCreate, BrandUpdate, BrandOut,
)

branches_router = APIRouter(prefix="/branches", tags=["branches"])
categories_router = APIRouter(prefix="/categories", tags=["categories"])
brands_router = APIRouter(prefix="/brands", tags=["brands"])


def _row_or_404(table: str, id_: str) -> dict[str, Any]:
    resp = (
        get_supabase_admin()
        .table(table)
        .select("*")
        .eq("id", id_)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail=f"{table[:-1].capitalize()} not found")
    return resp.data


def _save(table: str, label: str, data: dict, id_: str | None = None) -> dict[str, Any]:
    client = get_supabase_admin()
    try:
        if id_ is None:
            query = client.table(table).insert(data)
        else:
            query = client.table(table).update(data).eq("id", id_)
        resp = query.execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{label} could not be saved: {e}")
    return resp.data[0]


def _delete(table: str, label: str, id_: str) -> None:
    client = get_supabase_admin()
    try:
        client.table(table).delete().eq("id", id_).execute()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"{label} is in use and cannot be deleted: {e}",
        )


# ---- Branches ------------------------------------------------------------
@branches_router.get("", response_model=list[BranchOut])
async def list_branches():
    resp = get_supabase_admin().table("branches").select("*").order("name").execute()
    return resp.data or []


@branches_router.get("/{branch_id}", response_model=BranchOut)
async def get_branch(branch_id: str):
    return _row_or_404("branches", branch_id)


@branches_router.post("", response_model=BranchOut, status_code=201)
async def create_branch(payload: BranchCreate, _admin: CurrentUser = Depends(require_admin)):
    return _save("branches", "Branch", payload.model_dump())


@branches_router.patch("/{branch_id}", response_model=BranchOut)
async def update_branch(
    branch_id: str,
    payload: BranchUpdate,
    _admin: CurrentUser = Depends(require_admin),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    _row_or_404("branches", branch_id)
    return _save("branches", "Branch", data, branch_id)


@branches_router.delete("/{branch_id}", status_code=204)
async def delete_branch(branch_id: str, _admin: CurrentUser = Depends(require_admin)):
    _row_or_404("branches", branch_id)
    _delete("branches", "Branch", branch_id)


# ---- Categories ----------------------------------------------------------
@categories_router.get("", response_model=list[CategoryOut])
async def list_categories():
    resp = get_supabase_admin().table("categories").select("*").order("name").execute()
    return resp.data or []


@categories_router.get("/{category_id}", response_model=CategoryOut)
async def get_category(category_id: str):
    return _row_or_404("categories", category_id)


@categories_router.post("", response_model=CategoryOut, status_code=201)
async def create_category(payload: CategoryCreate, _admin: CurrentUser = Depends(require_admin)):
    return _save("categories", "Category", payload.model_dump())


@categories_router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    _admin: CurrentUser = Depends(require_admin),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    _row_or_404("categories", category_id)
    return _save("categories", "Category", data, category_id)


@categories_router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: str, _admin: CurrentUser = Depends(require_admin)):
    _row_or_404("categories", category_id)
    _delete("categories", "Category", category_id)


# ---- Brands ---------------------------------------------------------------
@brands_router.get("", response_model=list[BrandOut])
async def list_brands():
    resp = get_supabase_admin().table("brands").select("*").order("name").execute()
    return resp.data or []


@brands_router.get("/{brand_id}", response_model=BrandOut)
async def get_brand(brand_id: str):
    return _row_or_404("brands", brand_id)


@brands_router.post("", response_model=BrandOut, status_code=201)
async def create_brand(payload: BrandCreate, _admin: CurrentUser = Depends(require_admin)):
    return _save("brands", "Brand", payload.model_dump())


@brands_router.patch("/{brand_id}", response_model=BrandOut)
async def update_brand(
    brand_id: str,
    payload: BrandUpdate,
    _admin: CurrentUser = Depends(require_admin),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    _row_or_404("brands", brand_id)
    return _save("brands", "Brand", data, brand_id)


@brands_router.delete("/{brand_id}", status_code=204)
async def delete_brand(brand_id: str, _admin: CurrentUser = Depends(require_admin)):
    _row_or_404("brands", brand_id)
    _delete("brands", "Brand", brand_id)