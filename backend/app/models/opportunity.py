from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import BenefitType, EffortLevel, enum_column


class Opportunity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "opportunities"
    __table_args__ = (
        CheckConstraint("potential_amount >= 0", name="nonnegative_potential"),
        CheckConstraint("cost_amount >= 0", name="nonnegative_cost"),
        CheckConstraint("extra_clients >= 0", name="nonnegative_clients"),
        CheckConstraint("horizon_days > 0", name="positive_horizon"),
        CheckConstraint("confidence BETWEEN 0 AND 100", name="valid_confidence"),
    )

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    analysis_run_id: Mapped[UUID | None] = mapped_column(ForeignKey("analysis_runs.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text)
    benefit_type: Mapped[BenefitType] = mapped_column(enum_column(BenefitType, "benefit_type"))
    # Gross estimated benefit, before the cost of executing the opportunity.
    potential_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    cost_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    extra_clients: Mapped[int] = mapped_column(Integer)
    effort: Mapped[EffortLevel] = mapped_column(enum_column(EffortLevel, "effort_level"))
    horizon_days: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2))

    company = relationship("Company", back_populates="opportunities")
    analysis_run = relationship("AnalysisRun", back_populates="opportunities")
    simulation_runs = relationship("SimulationRun", back_populates="opportunity", passive_deletes="all")

    @property
    def roi(self) -> Decimal | None:
        if self.cost_amount == 0:
            return None
        return (self.potential_amount - self.cost_amount) / self.cost_amount * Decimal("100")
