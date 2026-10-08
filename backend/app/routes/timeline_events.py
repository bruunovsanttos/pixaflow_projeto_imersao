from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.enums import Severity
from app.schemas.timeline import TimelineEventCreate, TimelineEventResponse
from app.services.timeline_service import TimelineService

router = APIRouter(prefix="/companies/{company_id}/timeline-events", tags=["timeline-events"])
Database = Annotated[Session, Depends(get_db)]


@router.post("", response_model=TimelineEventResponse, status_code=201)
def create_event(company_id: UUID, data: TimelineEventCreate, db: Database):
    return TimelineService(db).create(company_id, data)


@router.get("", response_model=list[TimelineEventResponse])
def list_events(
    company_id: UUID, db: Database, severity: Severity | None = None,
    data_inicio: date | None = None, data_fim: date | None = None,
    offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100),
):
    return TimelineService(db).list(company_id, severity=severity, data_inicio=data_inicio,
                                    data_fim=data_fim, offset=offset, limit=limit)


@router.get("/{event_id}", response_model=TimelineEventResponse)
def get_event(company_id: UUID, event_id: UUID, db: Database):
    return TimelineService(db).get(company_id, event_id)
