from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.saved_scenario import SavedScenarioCreate, SavedScenarioResponse
from app.services.saved_scenario_service import SavedScenarioService

router = APIRouter(prefix="/companies/{company_id}/saved-scenarios", tags=["saved-scenarios"])
Database = Annotated[Session, Depends(get_db)]


@router.post("", response_model=SavedScenarioResponse, status_code=201)
def create_scenario(company_id: UUID, data: SavedScenarioCreate, db: Database):
    return SavedScenarioService(db).create(company_id, data)


@router.get("", response_model=list[SavedScenarioResponse])
def list_scenarios(company_id: UUID, db: Database, membership_id: UUID | None = None,
                   offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    return SavedScenarioService(db).list(company_id, membership_id=membership_id, offset=offset, limit=limit)


@router.get("/{scenario_id}", response_model=SavedScenarioResponse)
def get_scenario(company_id: UUID, scenario_id: UUID, db: Database):
    return SavedScenarioService(db).get(company_id, scenario_id)


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(company_id: UUID, scenario_id: UUID, db: Database) -> Response:
    SavedScenarioService(db).delete(company_id, scenario_id)
    return Response(status_code=204)
