"""Development snapshot from Nexora mocks, 2026-10-08.
Run: python scripts/seed.py. Preserves existing rows; never applies migrations.
"""
from datetime import date
from decimal import Decimal
from pathlib import Path
import sys
from uuid import NAMESPACE_URL, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy import select, text, func
from app.database.session import SessionLocal
from app.models.identity import Company, User, CompanyMembership
from app.models.preference import UserCompanyPreference
from app.models.risk import Risk, RiskRecommendation
from app.models.opportunity import Opportunity
from app.models.timeline import TimelineEvent, TimelineEventRecommendation

RISKS = [{'id': 'estoque-shampoo',
  'title': 'Ruptura de estoque',
  'category': 'Estoque',
  'description': 'Produto: Shampoo Professional 500ml',
  'detail': 'O consumo semanal subiu 22% e o fornecedor tem lead time de 6 '
            'dias. O saldo atual cobre apenas 3 dias de demanda.',
  'probability': 91,
  'impact': 8420,
  'deadline': '3 dias',
  'status': 'Ativo',
  'severity': 'critico',
  'cause': 'Aumento de demanda combinado a pedido de reposição não emitido na '
           'janela ideal.',
  'recommendations': ['Emitir pedido de compra hoje com 40 unidades',
                      'Ativar fornecedor alternativo para entrega em 48h',
                      'Limitar promoções do item até a reposição']},
 {'id': 'capacidade',
  'title': 'Capacidade operacional excedida',
  'category': 'Operação',
  'description': 'Capacidade projetada: 106%',
  'detail': 'A agenda de sexta-feira já opera acima do limite saudável, o que '
            'tende a gerar atrasos em cadeia.',
  'probability': 78,
  'impact': 4300,
  'deadline': 'sexta-feira',
  'status': 'Em análise',
  'severity': 'critico',
  'cause': 'Concentração de agendamentos no turno da tarde sem equipe de apoio '
           'escalada.',
  'recommendations': ['Redistribuir 6 atendimentos para quinta-feira',
                      'Escalar 1 profissional extra no turno da tarde',
                      'Bloquear encaixes acima de 95% de ocupação']},
 {'id': 'fluxo-caixa',
  'title': 'Pressão no fluxo de caixa',
  'category': 'Financeiro',
  'description': 'Projeção: -12%',
  'detail': 'Concentração de pagamentos a fornecedores na mesma semana em que '
            'os recebíveis caem.',
  'probability': 64,
  'impact': 6100,
  'deadline': 'próxima semana',
  'status': 'Monitorando',
  'severity': 'critico',
  'cause': 'Três boletos relevantes vencem antes da entrada dos recebíveis de '
           'cartão.',
  'recommendations': ['Negociar prorrogação de 10 dias com 2 fornecedores',
                      'Antecipar 30% dos recebíveis de cartão',
                      'Adiar compra não essencial de R$ 1.200']}]
OPPORTUNITIES = [{'id': 'capacidade-ociosa',
  'title': 'Capacidade ociosa detectada',
  'description': 'Terças-feiras entre 14h e 17h possuem 42% de capacidade '
                 'disponível de forma recorrente.',
  'action': 'Criar uma campanha promocional para o horário ocioso.',
  'potentialRevenue': 3280,
  'cost': 640,
  'roi': 412,
  'extraClients': 34,
  'effort': 'Baixo',
  'horizon': '30 dias',
  'confidence': 88},
 {'id': 'recompra',
  'title': 'Janela de recompra sendo perdida',
  'description': '128 clientes passaram do intervalo médio de retorno de 42 '
                 'dias sem novo agendamento.',
  'action': 'Disparar régua de reativação com oferta de retorno.',
  'potentialRevenue': 4120,
  'cost': 380,
  'roi': 984,
  'extraClients': 47,
  'effort': 'Baixo',
  'horizon': '21 dias',
  'confidence': 81},
 {'id': 'compra-volume',
  'title': 'Negociação de compra por volume',
  'description': 'O volume dos 3 principais insumos já atinge a faixa de '
                 'desconto do fornecedor.',
  'action': 'Renegociar tabela e consolidar pedidos mensais.',
  'potentialRevenue': 1480,
  'cost': 0,
  'roi': None,
  'extraClients': 0,
  'effort': 'Baixo',
  'horizon': '15 dias',
  'confidence': 91}]
TIMELINE = [{'id': 't0',
  'date': 'Hoje',
  'title': 'Operação normal',
  'severity': 'normal',
  'description': 'Indicadores dentro da faixa esperada, com saúde operacional '
                 'em 86 pontos.',
  'cause': 'Demanda estável e equipe completa.',
  'impact': 'Nenhum impacto financeiro previsto.',
  'recommendations': ['Manter monitoramento diário']},
 {'id': 't1',
  'date': '01 OUT',
  'title': 'Estoque do Shampoo Professional abaixo do ideal',
  'severity': 'atencao',
  'description': 'O saldo cruza o ponto de reposição definido para o item.',
  'cause': 'Consumo 22% acima da média das últimas 4 semanas.',
  'impact': 'Risco de indisponibilidade em atendimentos de alto ticket.',
  'recommendations': ['Emitir pedido de reposição',
                      'Revisar ponto de pedido do item']},
 {'id': 't2',
  'date': '03 OUT',
  'title': 'Possível ruptura de estoque',
  'severity': 'critico',
  'description': 'Probabilidade de 91% de zerar o item antes da entrega do '
                 'fornecedor.',
  'cause': 'Lead time de 6 dias maior que a cobertura atual de 3 dias.',
  'impact': 'Perda estimada de R$ 8.420 em vendas.',
  'recommendations': ['Acionar fornecedor alternativo',
                      'Substituir item em promoções']}]

TABLES = [Company, User, CompanyMembership, UserCompanyPreference, Risk, RiskRecommendation,
          Opportunity, TimelineEvent, TimelineEventRecommendation]


def seed_id(kind, key):
    return uuid5(NAMESPACE_URL, f"nexora:development:bellastudio:{kind}:{key}")


def validate_target(db):
    if db.get_bind().url.database != "nexora" or db.scalar(text("select current_database()")) != "nexora":
        raise RuntimeError("Seed requires PostgreSQL database nexora")
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    expected = set(ScriptDirectory.from_config(config).get_heads())
    current = set(MigrationContext.configure(db.connection()).get_current_heads())
    if not expected or current != expected:
        raise RuntimeError("Database must already be at Alembic head")


def ensure(db, model, identity, **values):
    existing = db.get(model, identity)
    if existing is not None:
        for key in ("company_id", "user_id", "risk_id", "timeline_event_id"):
            if key in values and getattr(existing, key) != values[key]:
                raise RuntimeError("Seed identifier conflicts with an existing relationship")
        return existing
    item = model(id=identity, **values)
    db.add(item)
    db.flush()
    return item


def populate(db):
    # Serialize concurrent seed processes. Lock is released on commit/rollback.
    db.execute(text("select pg_advisory_xact_lock(718204810)"))
    company = db.scalar(select(Company).where(Company.slug == "bellastudio"))
    if company is None:
        company = ensure(db, Company, seed_id("company", "bellastudio"),
                         slug="bellastudio", name="Bella Studio", segment="Beleza & Est?tica")
    user = db.scalar(select(User).where(User.email == "bruno@bellastudio.com.br"))
    if user is None:
        user = ensure(db, User, seed_id("user", "bruno"), name="Bruno Vieira", email="bruno@bellastudio.com.br")
    membership = db.scalar(select(CompanyMembership).where(
        CompanyMembership.company_id == company.id, CompanyMembership.user_id == user.id))
    if membership is None:
        membership = ensure(db, CompanyMembership, seed_id("membership", "bruno"),
                            company_id=company.id, user_id=user.id, job_title="Diretor de Opera??es")
    if db.get(UserCompanyPreference, membership.id) is None:
        db.add(UserCompanyPreference(membership_id=membership.id, alert_risks=True,
               alert_opportunities=True, alert_weekly=True, alert_capacity=False,
               horizon_days=7, sensitivity="equilibrada"))
        db.flush()
    for row in RISKS:
        risk = ensure(db, Risk, seed_id("risk", row["id"]), company_id=company.id,
            analysis_run_id=None, title=row["title"], category=row["category"],
            description=row["description"], detail=row["detail"], cause=row["cause"],
            probability=Decimal(str(row["probability"])), impact_amount=Decimal(str(row["impact"])),
            deadline_at=None, deadline_description=row["deadline"], status=row["status"], severity=row["severity"])
        recommendations(db, RiskRecommendation, "risk_id", risk.id, row)
    for row in OPPORTUNITIES:
        ensure(db, Opportunity, seed_id("opportunity", row["id"]), company_id=company.id,
            analysis_run_id=None, title=row["title"], description=row["description"], action=row["action"],
            benefit_type="cost_saving" if row["id"] == "compra-volume" else "revenue",
            potential_amount=Decimal(str(row["potentialRevenue"])), cost_amount=Decimal(str(row["cost"])),
            extra_clients=row["extraClients"], effort=row["effort"],
            horizon_days=int(row["horizon"].split()[0]), confidence=Decimal(str(row["confidence"])))
    # Fixed snapshot dates; reruns never move or overwrite existing events.
    for row, day in zip(TIMELINE, (8, 9, 11)):
        event = ensure(db, TimelineEvent, seed_id("timeline", row["id"]), company_id=company.id,
            analysis_run_id=None, event_date=date(2026,10,day), title=row["title"], severity=row["severity"],
            description=row["description"], cause=row["cause"], impact_description=row["impact"])
        recommendations(db, TimelineEventRecommendation, "timeline_event_id", event.id, row)


def recommendations(db, model, parent_column, parent_id, row):
    for position, value in enumerate(row["recommendations"]):
        existing = db.scalar(select(model).where(
            getattr(model, parent_column) == parent_id, model.position == position))
        if existing is None:
            ensure(db, model, seed_id(model.__tablename__, f"{row['id']}:{position}"),
                   **{parent_column: parent_id}, position=position, text=value)


def main():
    with SessionLocal() as db:
        # Exceptions automatically roll back all insertions, including flushed rows.
        with db.begin():
            validate_target(db)
            populate(db)
    print("Seed committed. PostgreSQL row counts:")
    with SessionLocal() as db:
        for model in TABLES:
            print(f"{model.__tablename__}: {db.scalar(select(func.count()).select_from(model))}")


if __name__ == "__main__":
    main()
