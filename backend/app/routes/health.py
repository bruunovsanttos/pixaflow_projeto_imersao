from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Indica que a API responde; nao verifica banco ou servicos externos."""
    return HealthResponse(status="ok")
