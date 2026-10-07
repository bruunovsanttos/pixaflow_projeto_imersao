from contextlib import contextmanager

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.services.errors import Conflict


@contextmanager
def transaction(db: Session):
    """Services own atomic writes; database constraints also cover races."""
    try:
        yield
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise Conflict("The operation conflicts with existing or related data") from exc
    except Exception:
        db.rollback()
        raise
