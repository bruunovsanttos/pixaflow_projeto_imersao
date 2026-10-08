from uuid import UUID

from sqlalchemy.orm import Session

from app.models.enums import BenefitType, EffortLevel
from app.models.opportunity import Opportunity
from app.repositories.opportunity_repository import OpportunityRepository
from app.schemas.opportunity import OpportunityCreate
from app.services.company_service import CompanyService
from app.services.errors import IdentityError, NotFound
from app.services.transaction import transaction


class OpportunityService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = OpportunityRepository(db)

    def create(self, company_id: UUID, data: OpportunityCreate) -> Opportunity:
        with transaction(self.db):
            CompanyService(self.db).get(company_id)
            if data.analysis_run_id is not None:
                analysis = self.repository.get_analysis_run(data.analysis_run_id)
                if analysis is None:
                    raise NotFound("Analysis run not found")
                if analysis.company_id != company_id:
                    raise IdentityError("Analysis run does not belong to this company", 422)
            opportunity = self.repository.add(Opportunity(company_id=company_id, **data.model_dump()))
        return opportunity

    def get(self, company_id: UUID, opportunity_id: UUID) -> Opportunity:
        CompanyService(self.db).get(company_id)
        opportunity = self.repository.get(company_id, opportunity_id)
        if opportunity is None:
            raise NotFound("Opportunity not found in this company")
        return opportunity

    def list(
        self, company_id: UUID, *, effort: EffortLevel | None = None,
        benefit_type: BenefitType | None = None, offset: int = 0, limit: int = 100,
    ) -> list[Opportunity]:
        CompanyService(self.db).get(company_id)
        return self.repository.list(company_id, effort=effort, benefit_type=benefit_type,
                                    offset=offset, limit=limit)
