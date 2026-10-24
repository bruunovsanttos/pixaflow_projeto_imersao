from datetime import date
from decimal import Decimal
from uuid import UUID
from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, CreatedAtMixin

class DailyRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__="daily_records"
    __table_args__=(UniqueConstraint("company_id","record_date",name="uq_daily_company_date"),
        CheckConstraint("revenue >= 0 AND planned >= 0 AND completed >= 0 AND on_time >= 0 AND on_time <= completed AND completed <= planned",name="valid_daily_tasks"),
        CheckConstraint("available_minutes >= 0 AND productive_minutes >= 0 AND productive_minutes <= available_minutes AND revision > 0",name="valid_daily_time"))
    company_id: Mapped[UUID]=mapped_column(ForeignKey("companies.id",ondelete="RESTRICT"),index=True)
    record_date: Mapped[date]=mapped_column(Date)
    revenue: Mapped[Decimal]=mapped_column(Numeric(18,2))
    planned: Mapped[int]=mapped_column(Integer)
    completed: Mapped[int]=mapped_column(Integer)
    on_time: Mapped[int]=mapped_column(Integer)
    available_minutes: Mapped[int]=mapped_column(Integer)
    productive_minutes: Mapped[int]=mapped_column(Integer)
    revision: Mapped[int]=mapped_column(Integer,default=1)
    note: Mapped[str]=mapped_column(String(500),default="")
    updated_by: Mapped[UUID]=mapped_column(ForeignKey("company_memberships.id",ondelete="RESTRICT"))

class DailyAudit(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__="daily_audits"
    company_id: Mapped[UUID]=mapped_column(ForeignKey("companies.id",ondelete="RESTRICT"),index=True)
    record_date: Mapped[date]=mapped_column(Date)
    actor_id: Mapped[UUID]=mapped_column(ForeignKey("company_memberships.id",ondelete="RESTRICT"))
    revision: Mapped[int]=mapped_column(Integer)
    values: Mapped[dict]=mapped_column(JSON)

class AnalyticsSnapshot(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__="analytics_snapshots"
    company_id: Mapped[UUID]=mapped_column(ForeignKey("companies.id",ondelete="RESTRICT"),index=True)
    reference_date: Mapped[date]=mapped_column(Date)
    created_by: Mapped[UUID]=mapped_column(ForeignKey("company_memberships.id",ondelete="RESTRICT"))
    model_version: Mapped[str]=mapped_column(String(100))
    input_digest: Mapped[str]=mapped_column(String(64))
    source_records: Mapped[list]=mapped_column(JSON)
    result: Mapped[dict]=mapped_column(JSON)
