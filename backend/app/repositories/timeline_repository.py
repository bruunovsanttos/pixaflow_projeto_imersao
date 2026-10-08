from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import AnalysisRun
from app.models.enums import Severity
from app.models.timeline import TimelineEvent


class TimelineRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, event: TimelineEvent) -> TimelineEvent:
        self.db.add(event)
        return event

    def get_analysis_run(self, analysis_run_id: UUID) -> AnalysisRun | None:
        return self.db.get(AnalysisRun, analysis_run_id)

    def get(self, company_id: UUID, event_id: UUID) -> TimelineEvent | None:
        return self.db.scalar(select(TimelineEvent).options(
            selectinload(TimelineEvent.recommendations),
        ).where(TimelineEvent.company_id == company_id, TimelineEvent.id == event_id))

    def list(
        self, company_id: UUID, *, severity: Severity | None = None,
        data_inicio: date | None = None, data_fim: date | None = None,
        offset: int = 0, limit: int = 100,
    ) -> list[TimelineEvent]:
        query = select(TimelineEvent).options(selectinload(TimelineEvent.recommendations)).where(
            TimelineEvent.company_id == company_id,
        )
        if severity is not None:
            query = query.where(TimelineEvent.severity == severity)
        if data_inicio is not None:
            query = query.where(TimelineEvent.event_date >= data_inicio)
        if data_fim is not None:
            query = query.where(TimelineEvent.event_date <= data_fim)
        return list(self.db.scalars(query.order_by(
            TimelineEvent.event_date, TimelineEvent.created_at, TimelineEvent.id,
        ).offset(offset).limit(limit)))
