import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/nexora/AppShell";
import { OpportunityCard, RiskCard, StatCard } from "@/components/nexora/cards";
import { Panel, Pill, severityLabel, severityTone } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { useCompanyData } from "@/hooks/use-company-data";
import { useIdentity } from "@/hooks/use-identity";
import { getRisks } from "@/lib/api/risks";
import { getOpportunities } from "@/lib/api/opportunities";
import { getTimelineEvents } from "@/lib/api/timeline";
import {
  riskListSchema,
  opportunityListSchema,
  timelineListSchema,
  opportunityLabels,
  formatTimelineDate,
} from "@/lib/api/company-data";
import { dashboardKpis, upcomingEvents } from "@/lib/dashboard";
import { DashboardDataStatus } from "@/components/nexora/DashboardDataStatus";
import { Progress } from "@/components/ui/progress";
import { useAnalytics } from "@/hooks/use-analytics";
import { money, type Snapshot } from "@/lib/api/analytics";
import { kpis } from "@/lib/mock-data";

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
        content: "Acompanhe os riscos, oportunidades e eventos cadastrados da sua empresa.",
      },
    ],
  }),
  component: Dashboard,
});

function HealthCard({ snapshot }: { snapshot: Snapshot | null | undefined }) {
  const score = snapshot?.result.health;
  return (
    <div className="relative rounded-2xl border bg-sidebar p-6 text-sidebar-accent-foreground shadow-[var(--shadow-glow)]">
      <p className="text-xs uppercase tracking-widest">Saúde operacional · Cumprimento no prazo</p>
      <p className="mt-4 text-5xl font-semibold">
        {score ?? "—"} <span className="text-sm">/ 100</span>
      </p>
      <Progress value={score ?? 0} className="mt-5" />
      <p className="mt-4 text-sm">
        Tarefas concluídas no prazo ÷ tarefas previstas.{" "}
        {score == null
          ? "Sem tarefas previstas registradas na análise."
          : `${snapshot?.result.coverage_days}/28 dias registrados.`}
      </p>
      <p className="mt-3 text-xs">
        Este indicador mede cumprimento de tarefas; não é uma avaliação geral da empresa.
      </p>
    </div>
  );
}
function TrendChart({ snapshot }: { snapshot: Snapshot | null | undefined }) {
  if (!snapshot?.result.trend.some((p) => p.score !== null))
    return (
      <p className="py-12 text-sm text-muted-foreground">
        Registre tarefas e gere uma análise para visualizar o histórico.
      </p>
    );
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={snapshot.result.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Area
            type="linear"
            dataKey="score"
            name="Cumprimento no prazo (%)"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.15}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Dashboard() {
  const identity = useIdentity();
  const analytics = useAnalytics();
  const snapshot = analytics.isError ? undefined : analytics.data;
  const riskResource = useCompanyData("risks", getRisks, riskListSchema, []);
  const opportunityResource = useCompanyData(
    "opportunities",
    getOpportunities,
    opportunityListSchema,
    [],
  );
  const timelineResource = useCompanyData("timeline", getTimelineEvents, timelineListSchema, []);
  const risks = riskResource.source === "api" ? riskResource.data : undefined;
  const opportunities = opportunityResource.source === "api" ? opportunityResource.data : undefined;
  const criticalRisks = risks?.filter((r) => r.severity === "critico").slice(0, 3) ?? [];
  const cards = dashboardKpis(kpis, risks, opportunities).map((card) => {
    if (card.id === "revenue")
      return {
        ...card,
        label: "Receita estimada · Próximos 30 dias",
        value:
          snapshot?.result.revenue_forecast != null ? money(snapshot.result.revenue_forecast) : "—",
        trend: "flat" as const,
        hint:
          snapshot?.result.revenue_forecast != null
            ? `Média histórica × 30 · ${snapshot.result.forecast_start} a ${snapshot.result.forecast_end}`
            : "Requer 28 dias completos e uma análise salva.",
      };
    if (card.id === "efficiency")
      return {
        ...card,
        label: "Eficiência · Tempo produtivo",
        value: snapshot?.result.efficiency != null ? `${snapshot.result.efficiency}%` : "—",
        trend: "flat" as const,
        hint: "Minutos produtivos ÷ minutos disponíveis registrados.",
      };
    return card;
  });
  const events = upcomingEvents(timelineResource.source === "api" ? timelineResource.data : []);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Visão Geral
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
              Olá{identity.source === "api" ? `, ${identity.settings.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-[15px]">
              Acompanhe os riscos, oportunidades e eventos cadastrados da sua empresa.
            </p>
          </div>
          <Button asChild size="lg" className="shadow-[var(--shadow-glow)]">
            <Link to="/simulador" search={{}}>
              <Sparkles className="size-4" />
              Simular uma decisão
            </Link>
          </Button>
        </div>

        {identity.source === "mock" && (
          <DashboardDataStatus label="Identidade" resource={identity} />
        )}
        <p className="mb-4 text-xs text-muted-foreground">
          Indicadores calculados a partir do cadastro manual. Riscos e oportunidades contam todos os
          registros da empresa, sem filtro de período.
          {snapshot &&
            ` Análise de ${snapshot.reference_date}: ${snapshot.result.coverage_days}/28 dias registrados. Receita estimada não considera sazonalidade.`}
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          {analytics.isPending && <p role="status">Carregando análise…</p>}
          {analytics.isError && (
            <>
              <p role="alert">Análise indisponível: {analytics.error.message}</p>
              <Button variant="outline" onClick={() => void analytics.refetch()}>
                Tentar novamente
              </Button>
            </>
          )}
          {snapshot === null && (
            <p>Nenhuma análise salva. Cadastre os dados diários para começar.</p>
          )}
          {snapshot?.stale && (
            <p role="alert" className="text-warning">
              Os dados mudaram desde esta análise. Os valores abaixo são históricos; gere uma nova
              análise.
            </p>
          )}
          <Button variant="outline" asChild>
            <Link to="/dados">Dados diários e análises</Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <HealthCard snapshot={snapshot} />
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((kpi) => (
              <StatCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(0,320px)]">
          <Panel
            title="Tendência da saúde operacional"
            description="Histórico diário do cumprimento de tarefas no prazo. Dias ausentes não são considerados zero."
          >
            <TrendChart snapshot={snapshot} />
          </Panel>

          <Panel
            title="Próximos eventos"
            description="Até quatro eventos a partir de hoje, em ordem de data."
          >
            <DashboardDataStatus label="Eventos" resource={timelineResource} />
            {timelineResource.source === "api" && events.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento futuro cadastrado.</p>
            )}
            <ul className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/60"
                >
                  <div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimelineDate(event.date)}
                    </p>
                  </div>
                  <Pill tone={severityTone[event.severity]}>{severityLabel[event.severity]}</Pill>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" asChild className="mt-3">
              <Link to="/linha-do-tempo">Ver linha do tempo</Link>
            </Button>
          </Panel>
        </div>

        <div className="mt-4">
          <Panel
            title="Riscos que exigem atenção"
            description="Até três riscos críticos cadastrados que merecem acompanhamento."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/riscos">Ver todos</Link>
              </Button>
            }
          >
            <DashboardDataStatus label="Riscos" resource={riskResource} />
            {risks && criticalRisks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum risco crítico cadastrado.</p>
            )}
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
            description="Até duas oportunidades cadastradas na empresa."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/oportunidades">Ver todas</Link>
              </Button>
            }
          >
            <DashboardDataStatus label="Oportunidades" resource={opportunityResource} />
            {opportunities?.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade cadastrada.</p>
            )}
            <div className="grid gap-4 xl:grid-cols-2">
              {opportunities?.slice(0, 2).map((o) => (
                <OpportunityCard key={o.id} opportunity={o} labels={opportunityLabels(o)} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
