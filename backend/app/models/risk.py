from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import RiskCategory, RiskStatus, Severity, enum_column


class Risk(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "risks"
    __table_args__ = (
        CheckConstraint("probability BETWEEN 0 AND 100", name="valid_probability"),
        CheckConstraint("impact_amount >= 0", name="nonnegative_impact"),
    )

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    analysis_run_id: Mapped[UUID | None] = mapped_column(ForeignKey("analysis_runs.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[RiskCategory] = mapped_column(enum_column(RiskCategory, "risk_category"))
    description: Mapped[str] = mapped_column(Text)
    detail: Mapped[str] = mapped_column(Text)
    cause: Mapped[str] = mapped_column(Text)
    probability: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    impact_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline_description: Mapped[str] = mapped_column(Text)
    status: Mapped[RiskStatus] = mapped_column(enum_column(RiskStatus, "risk_status"))
    severity: Mapped[Severity] = mapped_column(enum_column(Severity, "risk_severity"))

    company = relationship("Company", back_populates="risks")
    analysis_run = relationship("AnalysisRun", back_populates="risks")
    recommendations = relationship(
        "RiskRecommendation", back_populates="risk", order_by="RiskRecommendation.position",
        cascade="all, delete-orphan", passive_deletes=True,
    )


class RiskRecommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "risk_recommendations"
    __table_args__ = (
        UniqueConstraint("risk_id", "position", name="uq_risk_recommendations_position"),
        CheckConstraint("position >= 0", name="nonnegative_position"),
    )

    risk_id: Mapped[UUID] = mapped_column(ForeignKey("risks.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)

    risk = relationship("Risk", back_populates="recommendations")
