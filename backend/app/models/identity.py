from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Company(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "companies"

    slug: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    segment: Mapped[str] = mapped_column(String(120))

    memberships = relationship("CompanyMembership", back_populates="company", passive_deletes="all")
    analysis_runs = relationship("AnalysisRun", back_populates="company", passive_deletes="all")
    risks = relationship("Risk", back_populates="company", passive_deletes="all")
    opportunities = relationship("Opportunity", back_populates="company", passive_deletes="all")
    timeline_events = relationship("TimelineEvent", back_populates="company", passive_deletes="all")
    simulation_runs = relationship("SimulationRun", back_populates="company", passive_deletes="all")


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), unique=True)

    memberships = relationship("CompanyMembership", back_populates="user", passive_deletes="all")


class CompanyMembership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "company_memberships"
    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_memberships_company_user"),
    )

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    job_title: Mapped[str] = mapped_column(String(80))

    company = relationship("Company", back_populates="memberships")
    user = relationship("User", back_populates="memberships")
    preference = relationship(
        "UserCompanyPreference", back_populates="membership", uselist=False,
        cascade="all, delete-orphan", passive_deletes=True, single_parent=True,
    )
    simulation_runs = relationship("SimulationRun", back_populates="created_by", passive_deletes="all")
    saved_scenarios = relationship("SavedScenario", back_populates="membership", passive_deletes="all")
