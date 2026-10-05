from datetime import date
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import Severity, enum_column


class TimelineEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "timeline_events"

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    analysis_run_id: Mapped[UUID | None] = mapped_column(ForeignKey("analysis_runs.id", ondelete="RESTRICT"), index=True)
    event_date: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(200))
    severity: Mapped[Severity] = mapped_column(enum_column(Severity, "timeline_severity"))
    description: Mapped[str] = mapped_column(Text)
    cause: Mapped[str] = mapped_column(Text)
    impact_description: Mapped[str] = mapped_column(Text)

    company = relationship("Company", back_populates="timeline_events")
    analysis_run = relationship("AnalysisRun", back_populates="timeline_events")
    recommendations = relationship(
        "TimelineEventRecommendation", back_populates="event",
        order_by="TimelineEventRecommendation.position",
        cascade="all, delete-orphan", passive_deletes=True,
    )


class TimelineEventRecommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "timeline_event_recommendations"
    __table_args__ = (
        UniqueConstraint("timeline_event_id", "position", name="uq_timeline_recommendations_position"),
        CheckConstraint("position >= 0", name="nonnegative_position"),
    )

    timeline_event_id: Mapped[UUID] = mapped_column(ForeignKey("timeline_events.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)

    event = relationship("TimelineEvent", back_populates="recommendations")
