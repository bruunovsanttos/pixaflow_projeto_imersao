from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.enums import ForecastSensitivity, enum_column


class UserCompanyPreference(TimestampMixin, Base):
    __tablename__ = "user_company_preferences"
    __table_args__ = (
        CheckConstraint("horizon_days IN (7, 15, 30)", name="valid_horizon"),
    )

    membership_id: Mapped[UUID] = mapped_column(
        ForeignKey("company_memberships.id", ondelete="CASCADE"), primary_key=True,
    )
    alert_risks: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_opportunities: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_weekly: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_capacity: Mapped[bool] = mapped_column(Boolean, default=False)
    horizon_days: Mapped[int] = mapped_column(SmallInteger, default=7)
    sensitivity: Mapped[ForecastSensitivity] = mapped_column(
        enum_column(ForecastSensitivity, "forecast_sensitivity"),
        default=ForecastSensitivity.BALANCED,
    )

    membership = relationship("CompanyMembership", back_populates="preference")
