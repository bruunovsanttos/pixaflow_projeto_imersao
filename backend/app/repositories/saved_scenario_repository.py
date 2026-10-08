from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import CompanyMembership
from app.models.saved_scenario import SavedScenario
from app.models.simulation import SimulationRun


class SavedScenarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_membership(self, membership_id: UUID) -> CompanyMembership | None:
        return self.db.get(CompanyMembership, membership_id)

    def get_simulation(self, simulation_id: UUID) -> SimulationRun | None:
        return self.db.get(SimulationRun, simulation_id)

    def get_by_pair(self, membership_id: UUID, simulation_id: UUID) -> SavedScenario | None:
        return self.db.scalar(select(SavedScenario).where(
            SavedScenario.membership_id == membership_id,
            SavedScenario.simulation_id == simulation_id,
        ))

    def _company_query(self, company_id: UUID):
        # Both relationships must belong to the company, including legacy rows.
        return select(SavedScenario).join(SavedScenario.membership).join(SavedScenario.simulation).where(
            CompanyMembership.company_id == company_id, SimulationRun.company_id == company_id,
        )

    def get(self, company_id: UUID, scenario_id: UUID) -> SavedScenario | None:
        return self.db.scalar(self._company_query(company_id).where(SavedScenario.id == scenario_id))

    def list(self, company_id: UUID, *, membership_id: UUID | None = None,
             offset: int = 0, limit: int = 100) -> list[SavedScenario]:
        query = self._company_query(company_id)
        if membership_id is not None:
            query = query.where(SavedScenario.membership_id == membership_id)
        return list(self.db.scalars(query.order_by(
            SavedScenario.created_at, SavedScenario.id,
        ).offset(offset).limit(limit)))

    def add(self, scenario: SavedScenario) -> SavedScenario:
        self.db.add(scenario)
        return scenario

    def delete(self, scenario: SavedScenario) -> None:
        self.db.delete(scenario)
