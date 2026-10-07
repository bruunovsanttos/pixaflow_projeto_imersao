from uuid import UUID

from sqlalchemy.orm import Session

from app.models.identity import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.services.errors import Conflict, NotFound
from app.services.transaction import transaction


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def get(self, user_id: UUID) -> User:
        user = self.repository.get(user_id)
        if user is None:
            raise NotFound("User not found")
        return user

    def create(self, data: UserCreate) -> User:
        with transaction(self.db):
            if self.repository.get_by_email(str(data.email)):
                raise Conflict("User email already exists")
            user = self.repository.add(User(**data.model_dump()))
        return user
