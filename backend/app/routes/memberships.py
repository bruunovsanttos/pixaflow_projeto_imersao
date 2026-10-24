from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.membership import MembershipCreate, MembershipResponse
from app.services.membership_service import MembershipService

router = APIRouter(tags=["memberships"])
Database = Annotated[Session, Depends(get_db)]


@router.post("/companies/{company_id}/memberships", response_model=MembershipResponse, status_code=201)
def create_membership(company_id: UUID, data: MembershipCreate, db: Database):
    return MembershipService(db).create(company_id, data)


@router.get("/companies/{company_id}/memberships", response_model=list[MembershipResponse])
def list_memberships(company_id: UUID, request: Request, db: Database, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
    return ([request.state.membership] if request.state.membership else [])[offset:offset+limit]
