from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, identity: UUID) -> User | None:
        return self.db.get(User, identity)

    def add(self, entity: User) -> User:
        self.db.add(entity)
        return entity

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))
