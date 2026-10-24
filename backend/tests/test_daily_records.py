from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.operational import DailyRecord


def get_records():
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(DailyRecord)
                .order_by(DailyRecord.record_date)
            )
        )


def test_daily_records_exist():
    records = get_records()

    assert len(records) >= 28


def test_daily_records_have_unique_dates():
    records = get_records()

    dates = [
        record.record_date
        for record in records
    ]

    assert len(dates) == len(set(dates))


def test_daily_tasks_are_valid():
    records = get_records()

    for record in records:
        assert record.revenue >= 0

        assert record.planned >= 0
        assert record.completed >= 0
        assert record.on_time >= 0

        assert record.on_time <= record.completed
        assert record.completed <= record.planned


def test_daily_time_is_valid():
    records = get_records()

    for record in records:
        assert record.available_minutes >= 0
        assert record.productive_minutes >= 0

        assert (
            record.productive_minutes
            <= record.available_minutes
        )


def test_daily_revision_is_valid():
    records = get_records()

    for record in records:
        assert record.revision >= 1


def test_period_contains_28_days():
    records = get_records()

    dates = {
        record.record_date
        for record in records
    }

    assert len(dates) >= 28