from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.simulation import SimulationCreate, SimulationResponse
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/companies/{company_id}/simulations", tags=["simulations"])
Database = Annotated[Session, Depends(get_db)]


@router.post("", response_model=SimulationResponse, status_code=201)
def create_simulation(company_id: UUID, data: SimulationCreate, db: Database):
    return SimulationService(db).create(company_id, data)


@router.get("/{simulation_id}", response_model=SimulationResponse)
def get_simulation(company_id: UUID, simulation_id: UUID, db: Database):
    return SimulationService(db).get(company_id, simulation_id)
