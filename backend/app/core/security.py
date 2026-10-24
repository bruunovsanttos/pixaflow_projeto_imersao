import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from uuid import UUID
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.security import Credential, AuthSession, AccessGrant
from app.models.identity import CompanyMembership
from app.models.saved_scenario import SavedScenario
from app.models.simulation import SimulationRun

COOKIE = "nexora_session"
def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
def hash_password(password: str) -> str:
    if len(password) < 12 or len(password) > 128:
        raise ValueError("A senha deve ter de 12 a 128 caracteres.")
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=2**15, r=8, p=1, maxmem=64*1024*1024)
    return f"scrypt${salt.hex()}${key.hex()}"
def verify_password(password: str, encoded: str) -> bool:
    try:
        method, salt, expected = encoded.split("$")
        if method != "scrypt" or len(password) > 128: return False
        key = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**15, r=8, p=1, maxmem=64*1024*1024)
        return hmac.compare_digest(key.hex(), expected)
    except (ValueError, TypeError): return False

def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

def current_user(request: Request, db: Session = Depends(get_db)) -> UUID:
    token = request.cookies.get(COOKIE, "")
    session = db.get(AuthSession, token_digest(token)) if token else None
    if not session or utc(session.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(401, "Entre na sua conta para continuar.")
    credential = db.get(Credential, session.user_id)
    if not credential or not credential.active: raise HTTPException(401, "Sessão indisponível.")
    request.state.user_id = session.user_id
    return session.user_id

def as_uuid(value):
    try: return UUID(str(value))
    except (ValueError, TypeError): raise HTTPException(422, "Identificador inválido.") from None

async def authorize(request: Request, user_id: UUID = Depends(current_user), db: Session = Depends(get_db)):
    params = request.path_params
    method = request.method
    if method not in {"GET", "HEAD"} and request.headers.get("origin") not in request.app.state.settings.cors_origins:
        raise HTTPException(403, "Origem não autorizada.")
    company_id = params.get("company_id")
    if company_id:
        membership = db.scalar(select(CompanyMembership).where(CompanyMembership.company_id==as_uuid(company_id), CompanyMembership.user_id==user_id))
        if not membership: raise HTTPException(403, "Acesso não autorizado a esta empresa.")
        request.state.membership = membership
        grant = db.get(AccessGrant, membership.id)
        role = grant.role if grant else "viewer"
        request.state.role = role
        path = request.url.path
        if path.endswith("/memberships") and method != "GET":
            raise HTTPException(403, "Gerencie vínculos pelo provisionamento administrativo.")
        if method not in {"GET", "HEAD"} and role not in {"admin", "operator"}:
            raise HTTPException(403, "Seu perfil tem acesso somente de leitura.")
        if params.get("simulation_id"):
            entity = db.get(SimulationRun, as_uuid(params["simulation_id"]))
            if entity and entity.created_by_membership_id != membership.id: raise HTTPException(403, "Simulação de outro perfil.")
        if params.get("scenario_id"):
            entity = db.get(SavedScenario, as_uuid(params["scenario_id"]))
            if entity and entity.membership_id != membership.id: raise HTTPException(403, "Cenário de outro perfil.")
        selected = request.query_params.get("membership_id")
        if selected and as_uuid(selected) != membership.id: raise HTTPException(403, "Vínculo não autorizado.")
        if method in {"POST", "PUT", "PATCH"}:
            try: body = await request.json()
            except ValueError: body = {}
            if isinstance(body, dict):
                for key in ("membership_id", "created_by_membership_id"):
                    if key in body and as_uuid(body[key]) != membership.id: raise HTTPException(403, "Vínculo não autorizado.")
                if body.get("simulation_id"):
                    sim = db.get(SimulationRun, as_uuid(body["simulation_id"]))
                    if sim and sim.created_by_membership_id != membership.id: raise HTTPException(403, "Simulação de outro perfil.")
    elif "membership_id" in params:
        member = db.get(CompanyMembership, as_uuid(params["membership_id"]))
        if not member or member.user_id != user_id: raise HTTPException(403, "Vínculo não autorizado.")
    elif "user_id" in params:
        if as_uuid(params["user_id"]) != user_id: raise HTTPException(403, "Usuário não autorizado.")
    elif request.url.path == "/api/v1/companies" and method == "GET":
        pass
    else:
        raise HTTPException(403, "Operação disponível somente pelo provisionamento administrativo.")
