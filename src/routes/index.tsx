import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/nexora/AppShell";
import { OpportunityCard, RiskCard, StatCard } from "@/components/nexora/cards";
import { Panel, Pill, severityLabel, severityTone } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  forecasts,
  healthTrend,
  kpis,
  operationalHealth,
  opportunities,
  risks,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral — NEXORA" },
      {
        name: "description",
        content:
          "Saúde operacional, riscos e oportunidades previstos para os próximos 7 dias da sua empresa.",
      },
      { property: "og:title", content: "Visão Geral — NEXORA" },
      {
        property: "og:description",
        content: "Veja o que pode acontecer com sua operação nos próximos 7 dias.",
      },
    ],
  }),
  component: Dashboard,
});

function HealthCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-sidebar p-6 text-sidebar-accent-foreground shadow-[var(--shadow-glow)]">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[image:var(--gradient-brand)] opacity-25 blur-2xl" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/60">
          {operationalHealth.label}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="font-display text-5xl font-semibold leading-none">
            {operationalHealth.score}
          </span>
          <span className="pb-1 text-sm text-sidebar-foreground/60">/ 100</span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-xs font-semibold text-success">
          <ArrowUpRight className="size-3.5" />+{operationalHealth.delta} pontos em relação à última
          semana
        </p>
        <Progress
          value={operationalHealth.score}
          className="mt-5 h-2 bg-sidebar-accent [&>div]:bg-[image:var(--gradient-brand)]"
        />
        <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70">
          A Nexora projeta queda para 71 pontos em 7 dias se nenhuma ação for tomada.
        </p>
      </div>
    </div>
  );
}

function TrendChart() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={healthTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            domain={[60, 95]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Previsão"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            fill="url(#healthFill)"
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Média histórica"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Dashboard() {
  const criticalRisks = risks.filter((r) => r.severity === "critico").slice(0, 3);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Visão Geral
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Bom dia, Bruno.</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-[15px]">
              Veja o que pode acontecer com sua operação nos próximos 7 dias.
            </p>
          </div>
          <Button asChild size="lg" className="shadow-[var(--shadow-glow)]">
            <Link to="/simulador" search={{}}>
              <Sparkles className="size-4" />
              Simular uma decisão
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <HealthCard />
          <div className="grid gap-4 sm:grid-cols-2">
            {kpis.map((kpi) => (
              <StatCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(0,320px)]">
          <Panel
            title="Tendência da saúde operacional"
            description="Projeção para os próximos 7 dias comparada à média histórica."
          >
            <TrendChart />
          </Panel>

          <Panel title="Previsão dos próximos dias">
            <ul className="space-y-3">
              {forecasts.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/60"
                >
                  <div>
                    <p className="text-sm font-semibold">{f.label}</p>
                    <p className="text-xs text-muted-foreground">Saúde operacional prevista</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-semibold">{f.score}</span>
                    <Pill tone={severityTone[f.severity]}>{severityLabel[f.severity]}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="mt-4">
          <Panel
            title="Riscos que exigem atenção"
            description="Ordenados por probabilidade e impacto financeiro."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/riscos">Ver todos</Link>
              </Button>
            }
          >
            <div className="grid gap-4">
              {criticalRisks.map((risk) => (
                <RiskCard key={risk.id} risk={risk} compact />
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-4">
          <Panel
            title="Oportunidades detectadas"
            description="Ganhos identificados a partir dos padrões da sua operação."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/oportunidades">Ver todas</Link>
              </Button>
            }
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {opportunities.slice(0, 2).map((o) => (
                <OpportunityCard key={o.id} opportunity={o} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
