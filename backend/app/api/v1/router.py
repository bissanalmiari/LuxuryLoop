from fastapi import APIRouter

from app.api.v1.routes import auth_routes, admin_auth, reference_data, product

api_router = APIRouter()
api_router.include_router(auth_routes.router)
api_router.include_router(admin_auth.router)
api_router.include_router(reference_data.branches_router)
api_router.include_router(reference_data.categories_router)
api_router.include_router(reference_data.brands_router)
api_router.include_router(product.router)