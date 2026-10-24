from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from app.models.identity import Company, CompanyMembership
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.company import CompanyCreate, CompanyResponse
from app.services.company_service import CompanyService

router = APIRouter(tags=["companies"])
Database = Annotated[Session, Depends(get_db)]


@router.post("/companies", response_model=CompanyResponse, status_code=201)
def create_company(data: CompanyCreate, db: Database):
    return CompanyService(db).create(data)


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(request: Request, db: Database, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    return list(db.scalars(select(Company).join(CompanyMembership).where(CompanyMembership.user_id==request.state.user_id).order_by(Company.created_at,Company.id).offset(offset).limit(limit)))


@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(company_id: UUID, db: Database):
    return CompanyService(db).get(company_id)
