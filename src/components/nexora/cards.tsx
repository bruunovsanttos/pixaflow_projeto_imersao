import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Minus, Target, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Pill, severityLabel, severityTone, type Tone } from "@/components/nexora/primitives";
import { currency, type KpiCard, type Opportunity, type Risk } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const trendIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

export function StatCard({ kpi }: { kpi: KpiCard }) {
  const Icon = trendIcon[kpi.trend];
  return (
    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
        <Pill tone={kpi.tone}>
          <Icon className="size-3.5" />
        </Pill>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpi.value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
    </div>
  );
}

export function RiskCard({ risk, compact = false }: { risk: Risk; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const tone = severityTone[risk.severity];

  return (
    <>
      <article
        className={cn(
          "card-hover relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            risk.severity === "critico" && "bg-danger",
            risk.severity === "atencao" && "bg-warning",
            risk.severity === "normal" && "bg-success",
          )}
        />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">{risk.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{risk.description}</p>
          </div>
          <Pill tone={tone}>{severityLabel[risk.severity]}</Pill>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Probabilidade
            </p>
            <p className="font-display text-lg font-semibold">{risk.probability}%</p>
            <Progress value={risk.probability} className="mt-1.5 h-1.5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Impacto</p>
            <p className="font-display text-lg font-semibold">{currency(risk.impact)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prazo</p>
            <p className="font-display text-lg font-semibold">{risk.deadline}</p>
          </div>
          {!compact && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="font-display text-lg font-semibold">{risk.status}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {compact ? "Ver análise" : "Ver causa"}
          </Button>
          <Button size="sm" asChild>
            <Link to="/simulador" search={{ q: `Como resolver: ${risk.title}` }}>
              Simular solução
            </Link>
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">{risk.category}</span>
        </div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{risk.title}</DialogTitle>
            <DialogDescription>{risk.detail}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Causa provável
              </p>
              <p className="mt-1">{risk.cause}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Probabilidade</p>
                <p className="font-display text-base font-semibold">{risk.probability}%</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Impacto</p>
                <p className="font-display text-base font-semibold">{currency(risk.impact)}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Prazo</p>
                <p className="font-display text-base font-semibold">{risk.deadline}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recomendações
              </p>
              <ul className="mt-2 space-y-2">
                {risk.recommendations.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="w-full">
              <Link to="/simulador" search={{ q: `Como resolver: ${risk.title}` }}>
                Simular solução
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const effortTone: Record<Opportunity["effort"], Tone> = {
    Baixo: "success",
    Médio: "warning",
    Alto: "danger",
  };

  return (
    <article className="card-hover flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-insight-soft text-insight">
            <TrendingUp className="size-4.5" />
          </span>
          <h3 className="text-base font-semibold">{opportunity.title}</h3>
        </div>
        <Pill tone="insight">{opportunity.confidence}% confiança</Pill>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{opportunity.description}</p>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary-soft/70 p-3 text-sm">
        <Target className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold">Possível ação: </span>
          {opportunity.action}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Receita</p>
          <p className="font-display text-base font-semibold text-success">
            +{currency(opportunity.potentialRevenue)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Custo</p>
          <p className="font-display text-base font-semibold">{currency(opportunity.cost)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ROI</p>
          <p className="font-display text-base font-semibold">{opportunity.roi}%</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prazo</p>
          <p className="font-display text-base font-semibold">{opportunity.horizon}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 pt-1">
        <Button size="sm" asChild>
          <Link to="/simulador" search={{ q: opportunity.action }}>
            Simular oportunidade
          </Link>
        </Button>
        <Pill tone={effortTone[opportunity.effort]}>Esforço {opportunity.effort.toLowerCase()}</Pill>
        {opportunity.extraClients > 0 ? (
          <span className="ml-auto text-xs text-muted-foreground">
            +{opportunity.extraClients} clientes
          </span>
        ) : null}
      </div>
    </article>
  );
}
