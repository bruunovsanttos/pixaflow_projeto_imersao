import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    COOKIE,
    current_user,
    hash_password,
    token_digest,
    utc,
    verify_password,
)
from app.database.session import get_db
from app.models.identity import CompanyMembership, User
from app.models.security import (
    AccessGrant,
    AuthSession,
    Credential,
    LoginThrottle,
)


router = APIRouter(prefix="/auth", tags=["auth"])

Database = Annotated[Session, Depends(get_db)]

DUMMY_HASH = hash_password(
    "dummy-unusable-password-value"
)


class Login(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=1,
        max_length=128,
    )


def check_origin(request: Request) -> None:
    if (
        request.headers.get("origin")
        not in request.app.state.settings.cors_origins
    ):
        raise HTTPException(
            403,
            "Origem não autorizada.",
        )


def get_or_create_throttle(
    db: Session,
    key: str,
    now: datetime,
) -> LoginThrottle:
    """
    Obtém o controle de tentativas de login.

    Se duas requisições tentarem criar o mesmo
    registro simultaneamente, uma poderá receber
    IntegrityError por causa da primary key.

    Nesse caso fazemos rollback e buscamos
    novamente o registro criado pela outra
    requisição, evitando um falso HTTP 429.
    """

    throttle = db.scalar(
        select(LoginThrottle)
        .where(LoginThrottle.key == key)
        .with_for_update()
    )

    if throttle:
        return throttle

    throttle = LoginThrottle(
        key=key,
        attempts=0,
        window_start=now,
    )

    db.add(throttle)

    try:
        db.flush()

    except IntegrityError:
        db.rollback()

        throttle = db.scalar(
            select(LoginThrottle)
            .where(LoginThrottle.key == key)
            .with_for_update()
        )

        if not throttle:
            raise HTTPException(
                429,
                "Não foi possível processar o login. "
                "Tente novamente.",
            ) from None

    return throttle


@router.post("/login")
def login(
    data: Login,
    request: Request,
    response: Response,
    db: Database,
):
    check_origin(request)

    now = datetime.now(timezone.utc)

    email = (
        str(data.email)
        .strip()
        .lower()
    )

    key = token_digest(email)

    throttle = get_or_create_throttle(
        db=db,
        key=key,
        now=now,
    )

    if (
        now - utc(throttle.window_start)
        >= timedelta(minutes=15)
    ):
        throttle.attempts = 0
        throttle.window_start = now

    if throttle.attempts >= 5:
        db.rollback()

        raise HTTPException(
            429,
            "Muitas tentativas. Aguarde 15 minutos.",
        )

    user = db.scalar(
        select(User).where(
            func.lower(User.email) == email
        )
    )

    credential = (
        db.get(Credential, user.id)
        if user
        else None
    )

    valid = verify_password(
        data.password,
        (
            credential.password_hash
            if credential
            else DUMMY_HASH
        ),
    )

    if (
        not valid
        or not credential
        or not credential.active
    ):
        throttle.attempts += 1
        db.commit()

        raise HTTPException(
            401,
            "E-mail ou senha inválidos.",
        )

    # Login bem-sucedido zera as tentativas.
    throttle.attempts = 0

    # Rotaciona a sessão atual do navegador.
    old_token = request.cookies.get(COOKIE)

    if old_token:
        db.execute(
            delete(AuthSession).where(
                AuthSession.token_hash
                == token_digest(old_token)
            )
        )

    # Remove sessões expiradas.
    db.execute(
        delete(AuthSession).where(
            AuthSession.expires_at <= now
        )
    )

    token = secrets.token_urlsafe(32)

    db.add(
        AuthSession(
            token_hash=token_digest(token),
            user_id=user.id,
            expires_at=(
                now + timedelta(hours=8)
            ),
        )
    )

    db.commit()

    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        secure=request.app.state.settings.cookie_secure,
        samesite="lax",
        max_age=8 * 3600,
        path="/api/v1",
    )

    response.headers["Cache-Control"] = "no-store"

    return {
        "authenticated": True,
    }


@router.get("/me")
def me(
    request: Request,
    db: Database,
    user_id=Depends(current_user),
):
    user = db.get(
        User,
        user_id,
    )

    memberships = list(
        db.scalars(
            select(
                CompanyMembership
            ).where(
                CompanyMembership.user_id
                == user_id
            )
        )
    )

    return {
        "id": str(user.id),
        "name": user.name,
        "memberships": [
            {
                "id": str(membership.id),
                "company_id": str(
                    membership.company_id
                ),
                "role": (
                    grant.role
                    if (
                        grant := db.get(
                            AccessGrant,
                            membership.id,
                        )
                    )
                    else "viewer"
                ),
            }
            for membership in memberships
        ],
    }


@router.post(
    "/logout",
    status_code=204,
)
def logout(
    request: Request,
    db: Database,
):
    check_origin(request)

    token = request.cookies.get(
        COOKIE
    )

    if token:
        db.execute(
            delete(AuthSession).where(
                AuthSession.token_hash
                == token_digest(token)
            )
        )

    db.commit()

    response = Response(
        status_code=204
    )

    response.delete_cookie(
        COOKIE,
        path="/api/v1",
        httponly=True,
        secure=request.app.state.settings.cookie_secure,
        samesite="lax",
    )

    return response