from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.payment_methods import router as payment_methods_router
from app.api.v1.expenses import router as expenses_router
from app.api.v1.payments import router as payments_router
from app.api.v1.dashboard import router as dashboard_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(categories_router)
api_router.include_router(payment_methods_router)
api_router.include_router(expenses_router)
api_router.include_router(payments_router)
api_router.include_router(dashboard_router)
