from fastapi import APIRouter, Depends

from app.core.security import CurrentUser, get_current_user
from app.core.supabase_client import get_supabase_admin
from app.schemas.favorites import FavoriteItemOut, FavoriteItemAdd, FavoriteListResponse
from app.services import favorites_service

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListResponse)
async def list_favorites(user: CurrentUser = Depends(get_current_user)):
    favorites = favorites_service.list_favorites(get_supabase_admin(), user.id)
    return FavoriteListResponse(favorites=[FavoriteItemOut(**f) for f in favorites])


@router.post("", status_code=201)
async def add_favorite(payload: FavoriteItemAdd, user: CurrentUser = Depends(get_current_user)):
    favorites_service.add_favorite(get_supabase_admin(), user.id, payload.item_id)
    return {"ok": True}


@router.delete("/{item_id}", status_code=204)
async def remove_favorite(item_id: str, user: CurrentUser = Depends(get_current_user)):
    favorites_service.remove_favorite(get_supabase_admin(), user.id, item_id)