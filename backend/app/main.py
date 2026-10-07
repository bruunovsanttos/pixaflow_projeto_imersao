from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import Settings
from app.routes.router import api_router
from app.services.errors import IdentityError


def create_app() -> FastAPI:
    settings = Settings()
    application = FastAPI(title=settings.app_name, version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Content-Type"],
    )

    @application.exception_handler(IdentityError)
    async def identity_error_handler(request: Request, exc: IdentityError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    application.include_router(api_router, prefix="/api/v1")
    return application


app = create_app()
