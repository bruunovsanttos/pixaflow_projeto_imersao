import hashlib
import json
from datetime import timedelta
from decimal import Decimal

MODEL_VERSION="manual-v1"
WINDOW_DAYS=28

def provenance(records):
    sources=[{"date":r.record_date.isoformat(),"revision":r.revision,"id":str(r.id)} for r in sorted(records,key=lambda r:r.record_date)]
    digest=hashlib.sha256(json.dumps(sources,sort_keys=True).encode()).hexdigest()
    return sources,digest

def calculate(records, reference_date):
    start=reference_date-timedelta(days=WINDOW_DAYS-1)
    rows=sorted([r for r in records if start<=r.record_date<=reference_date],key=lambda r:r.record_date)
    if len({r.record_date for r in rows}) != len(rows): raise ValueError("Duplicate days")
    planned=sum(r.planned for r in rows)
    on_time=sum(r.on_time for r in rows)
    available=sum(r.available_minutes for r in rows)
    productive=sum(r.productive_minutes for r in rows)
    revenue=sum((Decimal(r.revenue) for r in rows),Decimal(0))
    ratio=lambda numerator,denominator: round(100*numerator/denominator,2) if denominator else None
    coverage=len(rows)
    by_day={r.record_date:r for r in rows}
    trend=[]
    for i in range(WINDOW_DAYS):
        day=start+timedelta(days=i);row=by_day.get(day)
        trend.append({"date":day.isoformat(),"score":ratio(row.on_time,row.planned) if row else None})
    return {
        "period_start":start.isoformat(),"period_end":reference_date.isoformat(),"coverage_days":coverage,"required_days":WINDOW_DAYS,
        "health":ratio(on_time,planned),"efficiency":ratio(productive,available),
        "revenue_actual":str(revenue.quantize(Decimal("0.01"))),
        "revenue_forecast":str((revenue/Decimal(WINDOW_DAYS)*30).quantize(Decimal("0.01"))) if coverage==WINDOW_DAYS else None,
        "forecast_days":30,"forecast_start":(reference_date+timedelta(days=1)).isoformat(),
        "forecast_end":(reference_date+timedelta(days=30)).isoformat(),
        "health_formula":"100 × tarefas concluídas no prazo / tarefas previstas",
        "efficiency_formula":"100 × minutos produtivos / minutos disponíveis",
        "forecast_formula":"Receita realizada nos 28 dias completos / 28 × 30. Extrapolação simples; não considera sazonalidade ou mudanças futuras.",
        "limitations":["Dados declarados manualmente, sem verificação externa.","Saúde representa cumprimento no prazo; eficiência representa uso produtivo do tempo.","Dias sem movimento devem ser cadastrados com zero; ausência de registro não é zero."],
        "trend":trend,
    }
