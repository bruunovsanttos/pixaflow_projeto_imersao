from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(tags=["users"])
Database = Annotated[Session, Depends(get_db)]


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(data: UserCreate, db: Database):
    return UserService(db).create(data)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Database):
    return UserService(db).get(user_id)
