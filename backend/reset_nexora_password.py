from getpass import getpass

from sqlalchemy import delete, select

from app.core.security import hash_password, verify_password, token_digest
from app.database.session import SessionLocal
from app.models.identity import User
from app.models.security import Credential, LoginThrottle, AuthSession


EMAIL = "bruno@bellastudio.com.br"

db = SessionLocal()

try:
    database_url = str(db.get_bind().url)

    if "neon.tech" not in database_url:
        raise RuntimeError(
            "ABORTADO: o banco atual não parece ser o Neon de produção."
        )

    print("Banco Neon identificado.")
    print("Usuário:", EMAIL)

    user = db.scalar(
        select(User).where(User.email == EMAIL)
    )

    if not user:
        raise RuntimeError(
            f"Usuário {EMAIL} não encontrado."
        )

    credential = db.get(Credential, user.id)

    if not credential:
        raise RuntimeError(
            "Credencial do usuário não encontrada."
        )

    password = getpass(
        "Digite a NOVA senha (mínimo 12 caracteres): "
    )

    confirmation = getpass(
        "Confirme a NOVA senha: "
    )

    if password != confirmation:
        raise RuntimeError(
            "As senhas não coincidem."
        )

    new_hash = hash_password(password)

    if not verify_password(password, new_hash):
        raise RuntimeError(
            "Falha ao validar o novo hash."
        )

    credential.password_hash = new_hash
    credential.active = True

    db.execute(
        delete(LoginThrottle).where(
            LoginThrottle.key == token_digest(EMAIL)
        )
    )

    db.execute(
        delete(AuthSession).where(
            AuthSession.user_id == user.id
        )
    )

    db.commit()

    print()
    print("Senha redefinida com sucesso.")
    print("Throttle removido.")
    print("Sessões antigas invalidadas.")

except Exception as exc:
    db.rollback()
    print()
    print("ERRO:", exc)

finally:
    db.close()