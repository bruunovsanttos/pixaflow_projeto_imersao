from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import AnalysisRun
from app.models.enums import BenefitType, EffortLevel
from app.models.opportunity import Opportunity


class OpportunityRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, opportunity: Opportunity) -> Opportunity:
        self.db.add(opportunity)
        return opportunity

    def get_analysis_run(self, analysis_run_id: UUID) -> AnalysisRun | None:
        return self.db.get(AnalysisRun, analysis_run_id)

    def get(self, company_id: UUID, opportunity_id: UUID) -> Opportunity | None:
        return self.db.scalar(select(Opportunity).where(
            Opportunity.company_id == company_id, Opportunity.id == opportunity_id,
        ))

    def list(
        self, company_id: UUID, *, effort: EffortLevel | None = None,
        benefit_type: BenefitType | None = None, offset: int = 0, limit: int = 100,
    ) -> list[Opportunity]:
        query = select(Opportunity).where(Opportunity.company_id == company_id)
        if effort is not None:
            query = query.where(Opportunity.effort == effort)
        if benefit_type is not None:
            query = query.where(Opportunity.benefit_type == benefit_type)
        return list(self.db.scalars(query.order_by(
            Opportunity.created_at, Opportunity.id,
        ).offset(offset).limit(limit)))
