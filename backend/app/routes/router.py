from fastapi import APIRouter, Depends
from app.core.security import authorize

from app.routes.health import router as health_router
from app.routes.companies import router as companies_router
from app.routes.users import router as users_router
from app.routes.memberships import router as memberships_router
from app.routes.preferences import router as preferences_router

from app.routes.risks import router as risks_router

from app.routes.opportunities import router as opportunities_router

from app.routes.timeline_events import router as timeline_events_router

from app.routes.simulations import router as simulations_router

from app.routes.saved_scenarios import router as saved_scenarios_router

api_router = APIRouter(dependencies=[Depends(authorize)])

api_router.include_router(companies_router)
api_router.include_router(users_router)
api_router.include_router(memberships_router)
api_router.include_router(preferences_router)
api_router.include_router(risks_router)
api_router.include_router(opportunities_router)
api_router.include_router(timeline_events_router)
api_router.include_router(simulations_router)
api_router.include_router(saved_scenarios_router)

from app.routes.analytics import router as analytics_router
api_router.include_router(analytics_router)
