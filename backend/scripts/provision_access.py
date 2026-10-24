"""Run from backend: python -m scripts.provision_access --email EMAIL --company-id UUID --role admin
Password is entered through the terminal, never command arguments or logs.
"""
import argparse
from getpass import getpass
from uuid import UUID
from sqlalchemy import select, delete, func
from app.database.session import SessionLocal
from app.models.identity import User, CompanyMembership
from app.models.security import Credential, AccessGrant, AuthSession
from app.core.security import hash_password

def main():
    parser=argparse.ArgumentParser(description="Provision access for an existing company membership")
    parser.add_argument("--email",required=True)
    parser.add_argument("--company-id",required=True,type=UUID)
    parser.add_argument("--role",choices=["admin","operator","viewer"],required=True)
    args=parser.parse_args()
    with SessionLocal() as db:
        user=db.scalar(select(User).where(func.lower(User.email)==args.email.strip().lower()))
        member=db.scalar(select(CompanyMembership).where(CompanyMembership.company_id==args.company_id,CompanyMembership.user_id==user.id)) if user else None
        if not member: raise SystemExit("Existing user/company membership not found. No changes made.")
        password=getpass("Nova senha (12 a 128 caracteres): ")
        if password != getpass("Confirme a senha: "): raise SystemExit("Senhas diferentes. Nenhuma alteração.")
        encoded=hash_password(password)
        credential=db.get(Credential,user.id)
        if credential: credential.password_hash=encoded; credential.active=True
        else: db.add(Credential(user_id=user.id,password_hash=encoded,active=True))
        grant=db.get(AccessGrant,member.id)
        if grant: grant.role=args.role
        else: db.add(AccessGrant(membership_id=member.id,role=args.role))
        db.execute(delete(AuthSession).where(AuthSession.user_id==user.id))
        db.commit()
    print("Acesso atualizado. Sessões anteriores revogadas.")
if __name__=="__main__": main()
