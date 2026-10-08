from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import AnalysisRun
from app.models.identity import CompanyMembership
from app.models.opportunity import Opportunity
from app.models.simulation import SimulationRun


class SimulationRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, simulation: SimulationRun) -> SimulationRun:
        self.db.add(simulation)
        return simulation

    def get_membership(self, membership_id: UUID) -> CompanyMembership | None:
        return self.db.get(CompanyMembership, membership_id)

    def get_analysis_run(self, analysis_run_id: UUID) -> AnalysisRun | None:
        return self.db.get(AnalysisRun, analysis_run_id)

    def get_opportunity(self, opportunity_id: UUID) -> Opportunity | None:
        return self.db.get(Opportunity, opportunity_id)

    def get(self, company_id: UUID, simulation_id: UUID) -> SimulationRun | None:
        return self.db.scalar(select(SimulationRun).options(
            selectinload(SimulationRun.metrics),
            selectinload(SimulationRun.recommendations),
        ).where(SimulationRun.company_id == company_id, SimulationRun.id == simulation_id))
