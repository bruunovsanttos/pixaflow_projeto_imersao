from uuid import UUID

from sqlalchemy.orm import Session

from app.models.enums import DecisionKind, SimulationVariant
from app.models.simulation import SimulationMetrics, SimulationRecommendation, SimulationRun
from app.repositories.simulation_repository import SimulationRepository
from app.schemas.simulation import SimulationCreate
from app.services.company_service import CompanyService
from app.services.errors import IdentityError, NotFound
from app.services.transaction import transaction


class SimulationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = SimulationRepository(db)

    def create(self, company_id: UUID, data: SimulationCreate) -> SimulationRun:
        with transaction(self.db):
            CompanyService(self.db).get(company_id)
            membership = self.repository.get_membership(data.created_by_membership_id)
            if membership is None:
                raise NotFound("Membership not found")
            if membership.company_id != company_id:
                raise IdentityError("Membership does not belong to this company", 422)
            if data.analysis_run_id is not None:
                analysis = self.repository.get_analysis_run(data.analysis_run_id)
                if analysis is None:
                    raise NotFound("Analysis run not found")
                if analysis.company_id != company_id:
                    raise IdentityError("Analysis run does not belong to this company", 422)
            if data.decision_kind == DecisionKind.OPPORTUNITY:
                if data.opportunity_id is None:
                    raise IdentityError("opportunity_id is required for opportunity decisions", 422)
                opportunity = self.repository.get_opportunity(data.opportunity_id)
                if opportunity is None:
                    raise NotFound("Opportunity not found")
                if opportunity.company_id != company_id:
                    raise IdentityError("Opportunity does not belong to this company", 422)
            elif data.opportunity_id is not None:
                raise IdentityError("opportunity_id must be null for other decisions", 422)
            simulation = SimulationRun(company_id=company_id, **data.model_dump(
                exclude={"baseline", "simulated", "recommendations"},
            ))
            # Named, required inputs ensure exactly one instance of each variant.
            simulation.metrics = [
                SimulationMetrics(variant=SimulationVariant.BASELINE, **data.baseline.model_dump()),
                SimulationMetrics(variant=SimulationVariant.SIMULATED, **data.simulated.model_dump()),
            ]
            simulation.recommendations = [
                SimulationRecommendation(position=position, text=text)
                for position, text in enumerate(data.recommendations)
            ]
            self.repository.add(simulation)
        return simulation

    def get(self, company_id: UUID, simulation_id: UUID) -> SimulationRun:
        CompanyService(self.db).get(company_id)
        simulation = self.repository.get(company_id, simulation_id)
        if simulation is None:
            raise NotFound("Simulation not found in this company")
        return simulation
