from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
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
def list_companies(db: Database, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    return CompanyService(db).list(offset, limit)


@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(company_id: UUID, db: Database):
    return CompanyService(db).get(company_id)
