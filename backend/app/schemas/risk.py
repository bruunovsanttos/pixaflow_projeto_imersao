from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import RiskCategory, RiskStatus, Severity
from app.schemas.identity_base import InputSchema, TimestampResponse

NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class RiskCreate(InputSchema):
    analysis_run_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    category: RiskCategory
    description: NonEmptyText
    detail: NonEmptyText
    cause: NonEmptyText
    probability: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    impact_amount: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    deadline_at: datetime | None = None
    deadline_description: NonEmptyText
    status: RiskStatus
    severity: Severity
    recommendations: list[NonEmptyText] = Field(default_factory=list)


class RiskRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    text: str


class RiskResponse(TimestampResponse):
    id: UUID
    company_id: UUID
    analysis_run_id: UUID | None
    title: str
    category: RiskCategory
    description: str
    detail: str
    cause: str
    probability: Decimal
    impact_amount: Decimal
    deadline_at: datetime | None
    deadline_description: str
    status: RiskStatus
    severity: Severity
    recommendations: list[RiskRecommendationResponse]
