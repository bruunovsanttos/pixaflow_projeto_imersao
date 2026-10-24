"""Carga inicial de 28 dias de dados operacionais da Bella Studio.

Uso:
    python scripts/seed_daily_data.py

O script:
- grava apenas no PostgreSQL Neon;
- não executa migrations;
- não sobrescreve datas já existentes;
- cria DailyRecord e DailyAudit na mesma transação.
"""

from datetime import date
from decimal import Decimal
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select, text

from app.database.session import SessionLocal
from app.models.identity import Company, CompanyMembership, User
from app.models.operational import DailyRecord, DailyAudit


DAILY_DATA = [
    # data, receita, previstas, concluidas, no prazo,
    # minutos disponíveis, minutos produtivos, observação
    ("2026-09-26", 1180, 14, 13, 12, 960, 780, "Movimento regular"),
    ("2026-09-27", 1360, 16, 15, 14, 960, 840, "Boa ocupação"),
    ("2026-09-28", 920, 11, 10, 9, 960, 650, "Demanda abaixo da média"),
    ("2026-09-29", 1540, 17, 16, 15, 960, 890, "Dia de alta demanda"),
    ("2026-09-30", 1670, 18, 17, 15, 960, 910, "Pequenos atrasos no fim do dia"),
    ("2026-10-01", 1280, 15, 14, 13, 960, 810, "Operação estável"),
    ("2026-10-02", 1750, 19, 18, 16, 960, 925, "Ocupação elevada"),
    ("2026-10-03", 1820, 20, 18, 15, 960, 930, "Sobrecarga no período da tarde"),
    ("2026-10-04", 990, 12, 11, 11, 960, 680, "Movimento reduzido"),
    ("2026-10-05", 1210, 14, 13, 12, 960, 760, "Rotina normal"),
    ("2026-10-06", 1450, 16, 15, 14, 960, 850, "Boa produtividade"),
    ("2026-10-07", 1580, 17, 16, 15, 960, 880, "Operação próxima da capacidade"),
    ("2026-10-08", 1740, 19, 18, 16, 960, 920, "Alta ocupação"),
    ("2026-10-09", 1640, 18, 17, 15, 960, 900, "Pequenos atrasos"),
    ("2026-10-10", 1910, 21, 19, 16, 960, 940, "Capacidade quase esgotada"),
    ("2026-10-11", 1080, 13, 12, 11, 960, 710, "Demanda moderada"),
    ("2026-10-12", 1250, 14, 14, 13, 960, 790, "Fluxo equilibrado"),
    ("2026-10-13", 1480, 16, 15, 14, 960, 850, "Produtividade consistente"),
    ("2026-10-14", 1590, 18, 17, 15, 960, 890, "Alguns atrasos"),
    ("2026-10-15", 1710, 19, 18, 16, 960, 915, "Alta demanda"),
    ("2026-10-16", 1840, 20, 19, 17, 960, 935, "Operação muito próxima do limite"),
    ("2026-10-17", 1980, 22, 20, 16, 960, 950, "Sobrecarga operacional"),
    ("2026-10-18", 1120, 13, 12, 11, 960, 720, "Movimento mais baixo"),
    ("2026-10-19", 1370, 15, 14, 13, 960, 800, "Operação normal"),
    ("2026-10-20", 1510, 17, 16, 15, 960, 860, "Boa eficiência"),
    ("2026-10-21", 1690, 19, 18, 16, 960, 910, "Alta utilização da equipe"),
    ("2026-10-22", 1760, 20, 18, 15, 960, 925, "Atrasos por excesso de demanda"),
    ("2026-10-23", 1880, 21, 19, 16, 960, 945, "Capacidade crítica no período da tarde"),
]


def validate_target(db):
    database_name = db.scalar(text("select current_database()"))
    host = db.get_bind().url.host or ""

    print(f"Banco: {database_name}")
    print(f"Host: {host}")

    if "neon.tech" not in host:
        raise RuntimeError(
            "Este script foi preparado para o PostgreSQL Neon. "
            "A conexão atual não aponta para neon.tech."
        )


def get_identity(db):
    company = db.scalar(
        select(Company).where(Company.slug == "bellastudio")
    )

    if company is None:
        raise RuntimeError("Empresa Bella Studio não encontrada.")

    user = db.scalar(
        select(User).where(
            User.email == "bruno@bellastudio.com.br"
        )
    )

    if user is None:
        raise RuntimeError(
            "Usuário bruno@bellastudio.com.br não encontrado."
        )

    membership = db.scalar(
        select(CompanyMembership).where(
            CompanyMembership.company_id == company.id,
            CompanyMembership.user_id == user.id,
        )
    )

    if membership is None:
        raise RuntimeError(
            "Membership do usuário na Bella Studio não encontrado."
        )

    return company, membership


def populate(db, company, membership):
    inserted = 0
    skipped = 0

    for (
        record_date,
        revenue,
        planned,
        completed,
        on_time,
        available_minutes,
        productive_minutes,
        note,
    ) in DAILY_DATA:

        parsed_date = date.fromisoformat(record_date)

        existing = db.scalar(
            select(DailyRecord).where(
                DailyRecord.company_id == company.id,
                DailyRecord.record_date == parsed_date,
            )
        )

        if existing is not None:
            print(
                f"SKIP {parsed_date}: registro já existe."
            )
            skipped += 1
            continue

        revision = 1

        record = DailyRecord(
            company_id=company.id,
            record_date=parsed_date,
            revenue=Decimal(str(revenue)),
            planned=planned,
            completed=completed,
            on_time=on_time,
            available_minutes=available_minutes,
            productive_minutes=productive_minutes,
            revision=revision,
            note=note,
            updated_by=membership.id,
        )

        db.add(record)

        audit_values = {
            "revenue": str(Decimal(str(revenue))),
            "planned": planned,
            "completed": completed,
            "on_time": on_time,
            "available_minutes": available_minutes,
            "productive_minutes": productive_minutes,
            "note": note,
        }

        audit = DailyAudit(
            company_id=company.id,
            record_date=parsed_date,
            actor_id=membership.id,
            revision=revision,
            values=audit_values,
        )

        db.add(audit)

        inserted += 1

        print(
            f"ADD  {parsed_date}: "
            f"R$ {revenue:.2f} | "
            f"{completed}/{planned} tarefas"
        )

    return inserted, skipped


def main():
    with SessionLocal() as db:
        validate_target(db)

        company, membership = get_identity(db)

        print()
        print(f"Empresa: {company.name}")
        print(f"Company ID: {company.id}")
        print(f"Membership ID: {membership.id}")
        print()

        with db.begin_nested():
            inserted, skipped = populate(
                db,
                company,
                membership,
            )

        db.commit()

    with SessionLocal() as db:
        company = db.scalar(
            select(Company).where(
                Company.slug == "bellastudio"
            )
        )

        total = db.scalar(
            select(func.count())
            .select_from(DailyRecord)
            .where(
                DailyRecord.company_id == company.id
            )
        )

    print()
    print("Carga concluída.")
    print(f"Novos registros: {inserted}")
    print(f"Registros ignorados: {skipped}")
    print(f"Total de dias no banco: {total}")


if __name__ == "__main__":
    main()