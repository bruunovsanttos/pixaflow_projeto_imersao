from uuid import UUID

from sqlalchemy.orm import Session

from app.models.enums import RiskCategory, RiskStatus, Severity
from app.models.risk import Risk, RiskRecommendation
from app.repositories.risk_repository import RiskRepository
from app.schemas.risk import RiskCreate
from app.services.company_service import CompanyService
from app.services.errors import IdentityError, NotFound
from app.services.transaction import transaction


class RiskService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = RiskRepository(db)

    def create(self, company_id: UUID, data: RiskCreate) -> Risk:
        with transaction(self.db):
            CompanyService(self.db).get(company_id)
            if data.analysis_run_id is not None:
                analysis = self.repository.get_analysis_run(data.analysis_run_id)
                if analysis is None:
                    raise NotFound("Analysis run not found")
                if analysis.company_id != company_id:
                    raise IdentityError("Analysis run does not belong to this company", 422)
            risk = Risk(company_id=company_id, **data.model_dump(exclude={"recommendations"}))
            risk.recommendations = [
                RiskRecommendation(position=position, text=text)
                for position, text in enumerate(data.recommendations)
            ]
            self.repository.add(risk)
        return risk

    def get(self, company_id: UUID, risk_id: UUID) -> Risk:
        CompanyService(self.db).get(company_id)
        risk = self.repository.get(company_id, risk_id)
        if risk is None:
            raise NotFound("Risk not found in this company")
        return risk

    def list(self, company_id: UUID, *, category: RiskCategory | None = None,
             severity: Severity | None = None, status: RiskStatus | None = None,
             offset: int = 0, limit: int = 100) -> list[Risk]:
        CompanyService(self.db).get(company_id)
        return self.repository.list(company_id, category=category, severity=severity,
                                    status=status, offset=offset, limit=limit)
