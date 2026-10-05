"""Import models to register all tables in Base.metadata; no database I/O."""

from app.models.analysis import AnalysisRun
from app.models.identity import Company, CompanyMembership, User
from app.models.opportunity import Opportunity
from app.models.preference import UserCompanyPreference
from app.models.risk import Risk, RiskRecommendation
from app.models.saved_scenario import SavedScenario
from app.models.simulation import SimulationMetrics, SimulationRecommendation, SimulationRun
from app.models.timeline import TimelineEvent, TimelineEventRecommendation

__all__ = [
    "AnalysisRun", "Company", "User", "CompanyMembership", "UserCompanyPreference",
    "Risk", "RiskRecommendation", "Opportunity", "TimelineEvent",
    "TimelineEventRecommendation", "SimulationRun", "SimulationMetrics",
    "SimulationRecommendation", "SavedScenario",
]
