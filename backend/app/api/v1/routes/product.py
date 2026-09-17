from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.core.security import get_staff_context, StaffContext, assert_branch_access
from app.core.supabase_client import get_supabase_admin
from app.schemas.product import (
    ProductOut, ProductCreate, ProductUpdate, ProductListResponse,
    ProductStatusUpdate, ProductImagesAdd,
)
from app.services import item_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    category_id: Optional[str] = Query(None),
    brand_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    client = get_supabase_admin()
    items, total = item_service.list_items(
        client, category_id=category_id, brand_id=brand_id, branch_id=branch_id,
        min_price=min_price, max_price=max_price, status=status, search=search,
        page=page, page_size=page_size,
    )
    return ProductListResponse(items=[ProductOut(**i) for i in items], total=total, page=page, page_size=page_size)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str):
    client = get_supabase_admin()
    return ProductOut(**item_service.get_item(client, product_id))


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(payload: ProductCreate, staff: StaffContext = Depends(get_staff_context)):
    assert_branch_access(staff, payload.branch_id)
    client = get_supabase_admin()
    item = item_service.create_item(client, payload.model_dump())
    return ProductOut(**item)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, payload: ProductUpdate, staff: StaffContext = Depends(get_staff_context)):
    client = get_supabase_admin()
    existing = item_service.get_item(client, product_id)
    assert_branch_access(staff, existing["branch_id"])

    # If they're also moving it to another branch, they must have rights there too.
    if payload.branch_id:
        assert_branch_access(staff, payload.branch_id)

    item = item_service.update_item(client, product_id, payload.model_dump(exclude_unset=True))
    return ProductOut(**item)


@router.patch("/{product_id}/status", response_model=ProductOut)
async def update_product_status(product_id: str, payload: ProductStatusUpdate, staff: StaffContext = Depends(get_staff_context)):
    client = get_supabase_admin()
    existing = item_service.get_item(client, product_id)
    assert_branch_access(staff, existing["branch_id"])
    item = item_service.update_item_status(client, product_id, payload.status)
    return ProductOut(**item)


@router.post("/{product_id}/images")
async def add_product_images(product_id: str, payload: ProductImagesAdd, staff: StaffContext = Depends(get_staff_context)):
    client = get_supabase_admin()
    existing = item_service.get_item(client, product_id)
    assert_branch_access(staff, existing["branch_id"])
    urls = item_service.add_item_images(client, product_id, payload.image_urls)
    return {"image_urls": urls}


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def delete_product_image(product_id: str, image_id: str, staff: StaffContext = Depends(get_staff_context)):
    client = get_supabase_admin()
    existing = item_service.get_item(client, product_id)
    assert_branch_access(staff, existing["branch_id"])
    item_service.delete_item_image(client, product_id, image_id)
    return None


@router.delete("/{product_id}/images", status_code=204)
async def delete_product_image_by_url(
    product_id: str,
    image_url: str = Query(...),
    staff: StaffContext = Depends(get_staff_context),
):
    client = get_supabase_admin()
    existing = item_service.get_item(client, product_id)
    assert_branch_access(staff, existing["branch_id"])
    item_service.delete_item_image_by_url(client, product_id, image_url)
    return None


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: str, staff: StaffContext = Depends(get_staff_context)):
    client = get_supabase_admin()
    existing = item_service.get_item(client, product_id)
    assert_branch_access(staff, existing["branch_id"])
    item_service.delete_item(client, product_id)
    return None