from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class AnalysisRun(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Analysis provenance only; no analytical engine or forecast models yet."""

    __tablename__ = "analysis_runs"

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    reference_date: Mapped[date] = mapped_column(Date)
    model_version: Mapped[str | None] = mapped_column(String(100))

    company = relationship("Company", back_populates="analysis_runs")
    risks = relationship("Risk", back_populates="analysis_run", passive_deletes="all")
    opportunities = relationship("Opportunity", back_populates="analysis_run", passive_deletes="all")
    timeline_events = relationship("TimelineEvent", back_populates="analysis_run", passive_deletes="all")
    simulation_runs = relationship("SimulationRun", back_populates="analysis_run", passive_deletes="all")
