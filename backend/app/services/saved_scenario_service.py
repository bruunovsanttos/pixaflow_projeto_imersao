from uuid import UUID

from sqlalchemy.orm import Session

from app.models.saved_scenario import SavedScenario
from app.repositories.saved_scenario_repository import SavedScenarioRepository
from app.schemas.saved_scenario import SavedScenarioCreate
from app.services.company_service import CompanyService
from app.services.errors import Conflict, IdentityError, NotFound
from app.services.transaction import transaction


class SavedScenarioService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = SavedScenarioRepository(db)

    def _validate_membership(self, company_id: UUID, membership_id: UUID) -> None:
        membership = self.repository.get_membership(membership_id)
        if membership is None:
            raise NotFound("Membership not found")
        if membership.company_id != company_id:
            raise IdentityError("Membership does not belong to this company", 422)

    def create(self, company_id: UUID, data: SavedScenarioCreate) -> SavedScenario:
        with transaction(self.db):
            CompanyService(self.db).get(company_id)
            self._validate_membership(company_id, data.membership_id)
            simulation = self.repository.get_simulation(data.simulation_id)
            if simulation is None:
                raise NotFound("Simulation not found")
            if simulation.company_id != company_id:
                raise IdentityError("Simulation does not belong to this company", 422)
            if self.repository.get_by_pair(data.membership_id, data.simulation_id):
                raise Conflict("This membership already saved this simulation")
            scenario = self.repository.add(SavedScenario(**data.model_dump()))
        return scenario

    def get(self, company_id: UUID, scenario_id: UUID) -> SavedScenario:
        CompanyService(self.db).get(company_id)
        scenario = self.repository.get(company_id, scenario_id)
        if scenario is None:
            raise NotFound("Saved scenario not found in this company")
        return scenario

    def list(self, company_id: UUID, *, membership_id: UUID | None = None,
             offset: int = 0, limit: int = 100) -> list[SavedScenario]:
        CompanyService(self.db).get(company_id)
        if membership_id is not None:
            self._validate_membership(company_id, membership_id)
        return self.repository.list(company_id, membership_id=membership_id, offset=offset, limit=limit)

    def delete(self, company_id: UUID, scenario_id: UUID) -> None:
        with transaction(self.db):
            scenario = self.get(company_id, scenario_id)
            self.repository.delete(scenario)
