from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin
from app.models.enums import DecisionKind, SimulationVariant, enum_column


class SimulationRun(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Stored calculation snapshot. Immutability and tenant checks belong to services."""

    __tablename__ = "simulation_runs"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="nonnegative_amount"),
        CheckConstraint("horizon_days > 0", name="positive_horizon"),
        CheckConstraint("additional_cost >= 0", name="nonnegative_additional_cost"),
        CheckConstraint("initial_capital >= 0", name="nonnegative_initial_capital"),
        CheckConstraint(
            "(decision_kind = 'opportunity' AND opportunity_id IS NOT NULL) OR "
            "(decision_kind <> 'opportunity' AND opportunity_id IS NULL)",
            name="opportunity_matches_decision",
        ),
    )

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    created_by_membership_id: Mapped[UUID] = mapped_column(ForeignKey("company_memberships.id", ondelete="RESTRICT"), index=True)
    analysis_run_id: Mapped[UUID | None] = mapped_column(ForeignKey("analysis_runs.id", ondelete="RESTRICT"), index=True)
    opportunity_id: Mapped[UUID | None] = mapped_column(ForeignKey("opportunities.id", ondelete="RESTRICT"), index=True)
    decision_kind: Mapped[DecisionKind] = mapped_column(enum_column(DecisionKind, "decision_kind"))
    amount: Mapped[int] = mapped_column(Integer)
    question: Mapped[str] = mapped_column(String(2000), default="")
    reference_date: Mapped[date] = mapped_column(Date)
    horizon_days: Mapped[int] = mapped_column(Integer)
    model_version: Mapped[str] = mapped_column(String(100))
    assumption: Mapped[str] = mapped_column(Text)
    additional_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    initial_capital: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    incremental_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2))

    company = relationship("Company", back_populates="simulation_runs")
    created_by = relationship("CompanyMembership", back_populates="simulation_runs")
    analysis_run = relationship("AnalysisRun", back_populates="simulation_runs")
    opportunity = relationship("Opportunity", back_populates="simulation_runs")
    metrics = relationship(
        "SimulationMetrics", back_populates="simulation",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    recommendations = relationship(
        "SimulationRecommendation", back_populates="simulation",
        order_by="SimulationRecommendation.position",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    saved_scenarios = relationship("SavedScenario", back_populates="simulation", passive_deletes="all")


class SimulationMetrics(Base):
    __tablename__ = "simulation_metrics"
    __table_args__ = (
        CheckConstraint("investment >= 0", name="nonnegative_investment"),
        CheckConstraint("clients >= 0", name="nonnegative_clients"),
        CheckConstraint("revenue >= 0", name="nonnegative_revenue"),
        CheckConstraint("capacity >= 0", name="nonnegative_capacity"),
    )

    simulation_id: Mapped[UUID] = mapped_column(ForeignKey("simulation_runs.id", ondelete="CASCADE"), primary_key=True)
    variant: Mapped[SimulationVariant] = mapped_column(enum_column(SimulationVariant, "simulation_variant"), primary_key=True)
    investment: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    clients: Mapped[int] = mapped_column(Integer)
    revenue: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    capacity: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    simulation = relationship("SimulationRun", back_populates="metrics")


class SimulationRecommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "simulation_recommendations"
    __table_args__ = (
        UniqueConstraint("simulation_id", "position", name="uq_simulation_recommendations_position"),
        CheckConstraint("position >= 0", name="nonnegative_position"),
    )

    simulation_id: Mapped[UUID] = mapped_column(ForeignKey("simulation_runs.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)

    simulation = relationship("SimulationRun", back_populates="recommendations")
