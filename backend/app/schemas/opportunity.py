from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.models.enums import BenefitType, EffortLevel
from app.schemas.identity_base import InputSchema, TimestampResponse


class OpportunityCreate(InputSchema):
    analysis_run_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    action: str = Field(min_length=1)
    benefit_type: BenefitType
    potential_amount: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    cost_amount: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    extra_clients: int = Field(ge=0, le=2147483647, strict=True)
    effort: EffortLevel
    horizon_days: int = Field(gt=0, le=2147483647, strict=True)
    confidence: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)


class OpportunityResponse(TimestampResponse):
    id: UUID
    company_id: UUID
    analysis_run_id: UUID | None
    title: str
    description: str
    action: str
    benefit_type: BenefitType
    potential_amount: Decimal
    cost_amount: Decimal
    extra_clients: int
    effort: EffortLevel
    horizon_days: int
    confidence: Decimal
    # Read from Opportunity.roi by from_attributes; never an input or DB column.
    roi: Decimal | None
