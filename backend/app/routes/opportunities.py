from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.enums import BenefitType, EffortLevel
from app.schemas.opportunity import OpportunityCreate, OpportunityResponse
from app.services.opportunity_service import OpportunityService

router = APIRouter(prefix="/companies/{company_id}/opportunities", tags=["opportunities"])
Database = Annotated[Session, Depends(get_db)]


@router.post("", response_model=OpportunityResponse, status_code=201)
def create_opportunity(company_id: UUID, data: OpportunityCreate, db: Database):
    return OpportunityService(db).create(company_id, data)


@router.get("", response_model=list[OpportunityResponse])
def list_opportunities(
    company_id: UUID, db: Database, effort: EffortLevel | None = None,
    benefit_type: BenefitType | None = None,
    offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100),
):
    return OpportunityService(db).list(company_id, effort=effort, benefit_type=benefit_type,
                                       offset=offset, limit=limit)


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(company_id: UUID, opportunity_id: UUID, db: Database):
    return OpportunityService(db).get(company_id, opportunity_id)
