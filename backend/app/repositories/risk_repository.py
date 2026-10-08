from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import AnalysisRun
from app.models.enums import RiskCategory, RiskStatus, Severity
from app.models.risk import Risk


class RiskRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, risk: Risk) -> Risk:
        self.db.add(risk)
        return risk

    def get_analysis_run(self, analysis_run_id: UUID) -> AnalysisRun | None:
        return self.db.get(AnalysisRun, analysis_run_id)

    def get(self, company_id: UUID, risk_id: UUID) -> Risk | None:
        return self.db.scalar(select(Risk).options(selectinload(Risk.recommendations)).where(
            Risk.company_id == company_id, Risk.id == risk_id,
        ))

    def list(self, company_id: UUID, *, category: RiskCategory | None = None,
             severity: Severity | None = None, status: RiskStatus | None = None,
             offset: int = 0, limit: int = 100) -> list[Risk]:
        query = select(Risk).options(selectinload(Risk.recommendations)).where(Risk.company_id == company_id)
        for column, value in [(Risk.category, category), (Risk.severity, severity), (Risk.status, status)]:
            if value is not None:
                query = query.where(column == value)
        return list(self.db.scalars(query.order_by(Risk.created_at, Risk.id).offset(offset).limit(limit)))
