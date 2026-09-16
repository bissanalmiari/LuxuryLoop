from fastapi import APIRouter

from app.api.v1.routes import auth_routes, admin_auth

api_router = APIRouter()
api_router.include_router(auth_routes.router)
api_router.include_router(admin_auth.router)