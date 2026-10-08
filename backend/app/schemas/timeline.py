from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import Severity
from app.schemas.identity_base import InputSchema, TimestampResponse

NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class TimelineEventCreate(InputSchema):
    analysis_run_id: UUID | None = None
    event_date: date
    title: str = Field(min_length=1, max_length=200)
    severity: Severity
    description: NonEmptyText
    cause: NonEmptyText
    impact_description: NonEmptyText
    recommendations: list[NonEmptyText] = Field(default_factory=list)


class TimelineEventRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    text: str


class TimelineEventResponse(TimestampResponse):
    id: UUID
    company_id: UUID
    analysis_run_id: UUID | None
    event_date: date
    title: str
    severity: Severity
    description: str
    cause: str
    impact_description: str
    recommendations: list[TimelineEventRecommendationResponse]
