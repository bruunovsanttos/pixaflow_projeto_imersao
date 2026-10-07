from typing import Literal
from uuid import UUID

from pydantic import StrictBool, model_validator

from app.models.enums import ForecastSensitivity
from app.schemas.identity_base import InputSchema, TimestampResponse


class PreferenceUpdate(InputSchema):
    """Omitted fields remain unchanged; explicit null is rejected."""

    alert_risks: StrictBool | None = None
    alert_opportunities: StrictBool | None = None
    alert_weekly: StrictBool | None = None
    alert_capacity: StrictBool | None = None
    horizon_days: Literal[7, 15, 30] | None = None
    sensitivity: ForecastSensitivity | None = None

    @model_validator(mode="after")
    def reject_nulls(self):
        if any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError("Preference fields cannot be null")
        return self


class PreferenceResponse(TimestampResponse):
    membership_id: UUID
    alert_risks: bool
    alert_opportunities: bool
    alert_weekly: bool
    alert_capacity: bool
    horizon_days: int
    sensitivity: ForecastSensitivity
