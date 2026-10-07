"""Synchronous database sessions; importing creates no connections or tables."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


engine = create_engine(Settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """Yield one session per dependency scope and always release its resources.

    Callers explicitly commit successful writes. Closing rolls back any
    outstanding transaction, including when request handling raises an error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
