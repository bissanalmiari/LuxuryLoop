from fastapi import APIRouter

from app.api.v1.routes import auth_routes, admin_auth, reference_data, product, inventory, consignment, cart, order, staff, reports, favorites

api_router = APIRouter()
api_router.include_router(auth_routes.router)
api_router.include_router(admin_auth.router)
api_router.include_router(reference_data.branches_router)
api_router.include_router(reference_data.categories_router)
api_router.include_router(reference_data.brands_router)
api_router.include_router(product.router)
api_router.include_router(inventory.router)
api_router.include_router(consignment.router)
api_router.include_router(cart.router)
api_router.include_router(order.router)
api_router.include_router(staff.router)
api_router.include_router(reports.router)
api_router.include_router(favorites.router)