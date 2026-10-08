from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.enums import RiskCategory, RiskStatus, Severity
from app.schemas.risk import RiskCreate, RiskResponse
from app.services.risk_service import RiskService

router = APIRouter(prefix="/companies/{company_id}/risks", tags=["risks"])
Database = Annotated[Session, Depends(get_db)]


@router.post("", response_model=RiskResponse, status_code=201)
def create_risk(company_id: UUID, data: RiskCreate, db: Database):
    return RiskService(db).create(company_id, data)


@router.get("", response_model=list[RiskResponse])
def list_risks(company_id: UUID, db: Database, category: RiskCategory | None = None,
               severity: Severity | None = None, status: RiskStatus | None = None,
               offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    return RiskService(db).list(company_id, category=category, severity=severity,
                                status=status, offset=offset, limit=limit)


@router.get("/{risk_id}", response_model=RiskResponse)
def get_risk(company_id: UUID, risk_id: UUID, db: Database):
    return RiskService(db).get(company_id, risk_id)
