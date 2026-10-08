from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.enums import Severity
from app.models.timeline import TimelineEvent, TimelineEventRecommendation
from app.repositories.timeline_repository import TimelineRepository
from app.schemas.timeline import TimelineEventCreate
from app.services.company_service import CompanyService
from app.services.errors import IdentityError, NotFound
from app.services.transaction import transaction


class TimelineService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = TimelineRepository(db)

    def create(self, company_id: UUID, data: TimelineEventCreate) -> TimelineEvent:
        with transaction(self.db):
            CompanyService(self.db).get(company_id)
            if data.analysis_run_id is not None:
                analysis = self.repository.get_analysis_run(data.analysis_run_id)
                if analysis is None:
                    raise NotFound("Analysis run not found")
                if analysis.company_id != company_id:
                    raise IdentityError("Analysis run does not belong to this company", 422)
            event = TimelineEvent(company_id=company_id, **data.model_dump(exclude={"recommendations"}))
            event.recommendations = [
                TimelineEventRecommendation(position=position, text=text)
                for position, text in enumerate(data.recommendations)
            ]
            self.repository.add(event)
        return event

    def get(self, company_id: UUID, event_id: UUID) -> TimelineEvent:
        CompanyService(self.db).get(company_id)
        event = self.repository.get(company_id, event_id)
        if event is None:
            raise NotFound("Timeline event not found in this company")
        return event

    def list(
        self, company_id: UUID, *, severity: Severity | None = None,
        data_inicio: date | None = None, data_fim: date | None = None,
        offset: int = 0, limit: int = 100,
    ) -> list[TimelineEvent]:
        if data_inicio is not None and data_fim is not None and data_inicio > data_fim:
            raise IdentityError("data_inicio must not be after data_fim", 422)
        CompanyService(self.db).get(company_id)
        return self.repository.list(company_id, severity=severity, data_inicio=data_inicio,
                                    data_fim=data_fim, offset=offset, limit=limit)
