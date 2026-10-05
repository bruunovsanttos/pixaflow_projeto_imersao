from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class SavedScenario(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "saved_scenarios"
    __table_args__ = (
        UniqueConstraint("membership_id", "simulation_id", name="uq_saved_scenarios_membership_simulation"),
    )

    membership_id: Mapped[UUID] = mapped_column(ForeignKey("company_memberships.id", ondelete="RESTRICT"), index=True)
    simulation_id: Mapped[UUID] = mapped_column(ForeignKey("simulation_runs.id", ondelete="RESTRICT"), index=True)

    membership = relationship("CompanyMembership", back_populates="saved_scenarios")
    simulation = relationship("SimulationRun", back_populates="saved_scenarios")
