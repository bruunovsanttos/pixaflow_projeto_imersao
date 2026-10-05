from enum import Enum

from sqlalchemy import Enum as SQLAlchemyEnum


class Severity(str, Enum):
    NORMAL = "normal"
    ATTENTION = "atencao"
    CRITICAL = "critico"


class RiskCategory(str, Enum):
    FINANCIAL = "Financeiro"
    INVENTORY = "Estoque"
    OPERATIONS = "Operação"
    PEOPLE = "Pessoas"


class RiskStatus(str, Enum):
    ACTIVE = "Ativo"
    UNDER_ANALYSIS = "Em análise"
    MONITORING = "Monitorando"


class EffortLevel(str, Enum):
    LOW = "Baixo"
    MEDIUM = "Médio"
    HIGH = "Alto"


class ForecastSensitivity(str, Enum):
    CONSERVATIVE = "conservadora"
    BALANCED = "equilibrada"
    AGGRESSIVE = "agressiva"


class DecisionKind(str, Enum):
    MARKETING = "marketing"
    STOCK = "stock"
    HIRE = "hire"
    PRICE = "price"
    UNIT = "unit"
    OPPORTUNITY = "opportunity"


class SimulationVariant(str, Enum):
    BASELINE = "baseline"
    SIMULATED = "simulated"


class BenefitType(str, Enum):
    REVENUE = "revenue"
    COST_SAVING = "cost_saving"


def enum_column(enum_class: type[Enum], name: str) -> SQLAlchemyEnum:
    """Persist public enum values as VARCHAR with a PostgreSQL CHECK constraint."""
    return SQLAlchemyEnum(
        enum_class, name=name,
        values_callable=lambda members: [member.value for member in members],
        native_enum=False, create_constraint=True, validate_strings=True,
    )
