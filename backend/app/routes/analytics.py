from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database.session import get_db
from app.models.operational import DailyRecord, DailyAudit, AnalyticsSnapshot
from app.services.analytics_service import calculate, provenance, MODEL_VERSION

router=APIRouter(prefix="/companies/{company_id}",tags=["analytics"])
Database=Annotated[Session,Depends(get_db)]

def today(): return datetime.now(ZoneInfo("America/Sao_Paulo")).date()

class DailyInput(BaseModel):
    model_config=ConfigDict(extra="forbid")
    revenue: Decimal=Field(ge=0,max_digits=18,decimal_places=2)
    planned: int=Field(ge=0,le=1000000,strict=True)
    completed: int=Field(ge=0,le=1000000,strict=True)
    on_time: int=Field(ge=0,le=1000000,strict=True)
    available_minutes: int=Field(ge=0,le=100000000,strict=True)
    productive_minutes: int=Field(ge=0,le=100000000,strict=True)
    expected_revision: int=Field(ge=0,strict=True)
    note: str=Field(default="",max_length=500)
    @model_validator(mode="after")
    def consistent(self):
        if not self.on_time<=self.completed<=self.planned: raise ValueError("No prazo ≤ concluídas ≤ previstas")
        if self.productive_minutes>self.available_minutes: raise ValueError("Minutos produtivos não podem exceder os disponíveis")
        return self

class DailyResponse(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    record_date: date
    revenue: Decimal
    planned: int
    completed: int
    on_time: int
    available_minutes: int
    productive_minutes: int
    revision: int
    note: str

@router.get("/daily-data",response_model=list[DailyResponse])
def list_daily(company_id: UUID, db: Database, start: date | None=None,end: date | None=None):
    end=end or today(); start=start or end-timedelta(days=89)
    if start>end or (end-start).days>365: raise HTTPException(422,"Use um intervalo de até 366 dias.")
    return list(db.scalars(select(DailyRecord).where(DailyRecord.company_id==company_id,DailyRecord.record_date>=start,DailyRecord.record_date<=end).order_by(DailyRecord.record_date.desc())))

@router.put("/daily-data/{record_date}",response_model=DailyResponse)
def save_daily(company_id: UUID,record_date: date,data: DailyInput,request: Request,db: Database):
    if record_date>today(): raise HTTPException(422,"Não é possível registrar dados realizados no futuro.")
    row=db.scalar(select(DailyRecord).where(DailyRecord.company_id==company_id,DailyRecord.record_date==record_date).with_for_update())
    if (row.revision if row else 0)!=data.expected_revision: raise HTTPException(409,"Este dia foi alterado. Recarregue os dados antes de salvar.")
    values=data.model_dump(exclude={"expected_revision"})
    if row:
        for key,value in values.items(): setattr(row,key,value)
        row.revision+=1; row.updated_by=request.state.membership.id
    else:
        row=DailyRecord(company_id=company_id,record_date=record_date,updated_by=request.state.membership.id,revision=1,**values);db.add(row)
    db.add(DailyAudit(company_id=company_id,record_date=record_date,actor_id=request.state.membership.id,revision=row.revision,values=data.model_dump(mode="json",exclude={"expected_revision"})))
    try: db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,"Conflito de edição. Recarregue os dados.") from None
    return row

@router.get("/daily-data/{record_date}/history")
def daily_history(company_id: UUID,record_date: date,db: Database):
    rows=db.scalars(select(DailyAudit).where(DailyAudit.company_id==company_id,DailyAudit.record_date==record_date).order_by(DailyAudit.revision.desc()))
    return [{"revision":r.revision,"created_at":r.created_at,"values":r.values} for r in rows]

class RunInput(BaseModel):
    model_config=ConfigDict(extra="forbid")
    reference_date: date

def records_for(db,company_id,reference_date):
    return list(db.scalars(select(DailyRecord).where(DailyRecord.company_id==company_id,DailyRecord.record_date>=reference_date-timedelta(days=27),DailyRecord.record_date<=reference_date)))
def snapshot_response(snapshot,db):
    _,digest=provenance(records_for(db,snapshot.company_id,snapshot.reference_date))
    return {"id":str(snapshot.id),"reference_date":snapshot.reference_date,"created_at":snapshot.created_at,"model_version":snapshot.model_version,"source_records":snapshot.source_records,"stale":digest!=snapshot.input_digest,"result":snapshot.result}

@router.post("/analytics",status_code=201)
def run_analysis(company_id: UUID,data: RunInput,request: Request,db: Database):
    if data.reference_date>=today(): raise HTTPException(422,"Escolha um dia encerrado, anterior a hoje.")
    rows=records_for(db,company_id,data.reference_date)
    sources,digest=provenance(rows)
    snapshot=AnalyticsSnapshot(created_at=datetime.now(timezone.utc),company_id=company_id,reference_date=data.reference_date,created_by=request.state.membership.id,model_version=MODEL_VERSION,input_digest=digest,source_records=sources,result=calculate(rows,data.reference_date))
    db.add(snapshot);db.commit()
    return snapshot_response(snapshot,db)

@router.get("/analytics/latest")
def latest(company_id: UUID,db: Database):
    snapshot=db.scalar(select(AnalyticsSnapshot).where(AnalyticsSnapshot.company_id==company_id).order_by(AnalyticsSnapshot.created_at.desc(),AnalyticsSnapshot.id.desc()).limit(1))
    return snapshot_response(snapshot,db) if snapshot else None

@router.get("/analytics/history")
def analysis_history(company_id: UUID,db: Database,limit:int=Query(20,ge=1,le=100)):
    rows=db.scalars(select(AnalyticsSnapshot).where(AnalyticsSnapshot.company_id==company_id).order_by(AnalyticsSnapshot.created_at.desc(),AnalyticsSnapshot.id.desc()).limit(limit))
    return [snapshot_response(r,db) for r in rows]
