from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import DecisionKind, SimulationVariant
from app.schemas.identity_base import InputSchema

Money = Annotated[Decimal, Field(ge=0, max_digits=18, decimal_places=2)]
NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SimulationMetricsCreate(InputSchema):
    investment: Money
    clients: int = Field(ge=0, le=2147483647, strict=True)
    revenue: Money
    capacity: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class SimulationCreate(InputSchema):
    decision_kind: DecisionKind
    amount: int = Field(ge=0, le=2147483647, strict=True)
    question: str = Field(default="", max_length=2000)
    reference_date: date
    horizon_days: int = Field(gt=0, le=2147483647, strict=True)
    model_version: str = Field(min_length=1, max_length=100)
    assumption: NonEmptyText
    additional_cost: Money
    initial_capital: Money
    incremental_balance: Decimal = Field(max_digits=18, decimal_places=2)
    created_by_membership_id: UUID
    analysis_run_id: UUID | None = None
    opportunity_id: UUID | None = None
    baseline: SimulationMetricsCreate
    simulated: SimulationMetricsCreate
    recommendations: list[NonEmptyText] = Field(default_factory=list)


class SimulationMetricsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    variant: SimulationVariant
    investment: Decimal
    clients: int
    revenue: Decimal
    capacity: Decimal


class SimulationRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    text: str


class SimulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    created_by_membership_id: UUID
    analysis_run_id: UUID | None
    opportunity_id: UUID | None
    decision_kind: DecisionKind
    amount: int
    question: str
    reference_date: date
    horizon_days: int
    model_version: str
    assumption: str
    additional_cost: Decimal
    initial_capital: Decimal
    incremental_balance: Decimal
    created_at: datetime
    metrics: list[SimulationMetricsResponse] = Field(min_length=2, max_length=2)
    recommendations: list[SimulationRecommendationResponse]
