from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.payment_methods import router as payment_methods_router
from app.api.v1.credit_cards import router as credit_cards_router
from app.api.v1.categories import router as categories_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.items import router as items_router
from app.api.v1.debts import router as debts_router
from app.api.v1.schedules import router as schedules_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.budgets import router as budgets_router
from app.api.v1.goals import router as goals_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.sync import router as sync_router
from app.api.v1.attachments import router as attachments_router
from app.api.v1.conciliation import router as conciliation_router
from app.api.v1.system import router as system_router
from app.api.v1.planning import router as planning_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(accounts_router)
api_router.include_router(payment_methods_router)
api_router.include_router(credit_cards_router)
api_router.include_router(categories_router)
api_router.include_router(contacts_router)
api_router.include_router(items_router)
api_router.include_router(debts_router)
api_router.include_router(schedules_router)
api_router.include_router(transactions_router)
api_router.include_router(budgets_router)
api_router.include_router(goals_router)
api_router.include_router(dashboard_router)
api_router.include_router(sync_router)
api_router.include_router(attachments_router)
api_router.include_router(conciliation_router)
api_router.include_router(system_router)
api_router.include_router(planning_router)



