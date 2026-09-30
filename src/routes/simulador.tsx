import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Loader2, Save, Scale, Sparkles } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { AppShell } from "@/components/nexora/AppShell";
import { EmptyState, PageHeader, Panel, Pill, type Tone } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  baseScenario,
  currency,
  scenarioSeries,
  simulatedScenario,
  simulationImpacts,
  simulationSuggestions,
  type ScenarioMetrics,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulador")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = search["q"];
    return typeof q === "string" ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Simulador de Decisões — NEXORA" },
      {
        name: "description",
        content: "Teste uma decisão e veja receita, demanda, custo e capacidade antes de aplicar.",
      },
      { property: "og:title", content: "Simulador de Decisões — NEXORA" },
      {
        property: "og:description",
        content: "Teste uma decisão antes de aplicá-la na sua empresa.",
      },
    ],
  }),
  component: SimulatorPage,
});

function ScenarioColumn({
  label,
  tone,
  data,
}: {
  label: string;
  tone: "muted" | "primary";
  data: ScenarioMetrics;
}) {
  const rows = [
    { label: "Investimento", value: currency(data.investment) },
    { label: "Clientes previstos", value: String(data.clients) },
    { label: "Receita", value: currency(data.revenue) },
    { label: "Capacidade operacional", value: `${data.capacity}%` },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        tone === "primary"
          ? "border-primary/40 bg-primary-soft/40 shadow-[var(--shadow-card)]"
          : "border-border bg-card",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <dl className="mt-4 space-y-3.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "font-display text-lg font-semibold",
                tone === "primary" && row.label === "Capacidade operacional" && "text-danger",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ResultsChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scenarioSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            tickFormatter={(v) => `${v / 1000}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            formatter={(v: number) => currency(v)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="atual" name="Cenário atual" fill="var(--color-muted-foreground)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="simulado" name="Cenário simulado" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="ajustado" name="Resultado ajustado" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimulatorPage() {
  const { q } = Route.useSearch();
  const [question, setQuestion] = useState(q ?? "");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  function simulate() {
    if (!question.trim()) return;
    setState("loading");
    setTimeout(() => setState("done"), 1200);
  }

  const impactToneMap: Record<string, Tone> = {
    success: "success",
    warning: "warning",
    danger: "danger",
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          eyebrow="Simulações"
          title="Simulador de Decisões"
          description="Teste uma decisão antes de aplicá-la na sua empresa."
        />

        <Panel className="border-primary/30">
          <label htmlFor="decision" className="text-base font-semibold">
            O que você está pensando em fazer?
          </label>
          <Textarea
            id="decision"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex: O que acontece se eu aumentar meus investimentos em marketing em 30%?"
            className="mt-3 min-h-28 resize-none text-[15px]"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {simulationSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuestion(s)}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            size="lg"
            className="mt-5 w-full sm:w-auto"
            onClick={simulate}
            disabled={state === "loading" || !question.trim()}
          >
            {state === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {state === "loading" ? "Simulando cenários..." : "Simular decisão"}
          </Button>
        </Panel>

        {state === "idle" ? (
          <div className="mt-4">
            <EmptyState
              icon={<Scale className="size-6" />}
              title="Nenhuma simulação ainda"
              description="Descreva uma decisão ou escolha uma sugestão acima para comparar o cenário atual com o cenário simulado."
            />
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl md:col-span-2" />
          </div>
        ) : null}

        {state === "done" ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <ScenarioColumn label="Cenário atual" tone="muted" data={baseScenario} />
              <div className="hidden size-10 place-items-center rounded-full bg-primary text-primary-foreground md:grid">
                <ArrowRight className="size-5" />
              </div>
              <ScenarioColumn label="Cenário simulado" tone="primary" data={simulatedScenario} />
            </div>

            <div className="rounded-2xl border border-warning/40 bg-warning-soft p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
                <div>
                  <p className="font-semibold">
                    Sua operação atual não suporta completamente esse aumento de demanda.
                  </p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Recomendação
                  </p>
                  <ul className="mt-1 space-y-1 text-sm">
                    <li>• Adicionar 1 funcionário</li>
                    <li>• Aumentar estoque em 18%</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    Resultado operacional ajustado:{" "}
                    <span className="font-display text-lg font-semibold text-success">
                      {currency(41200)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <Panel title="Impacto da decisão">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {simulationImpacts.map((impact) => (
                  <div
                    key={impact.label}
                    className="card-hover rounded-2xl border border-border bg-card p-5"
                  >
                    <p className="text-sm text-muted-foreground">{impact.label}</p>
                    <p className="mt-2 font-display text-2xl font-semibold">{impact.value}</p>
                    <Pill tone={impactToneMap[impact.tone] ?? "muted"} className="mt-3">
                      {impact.tone === "success"
                        ? "Ganho"
                        : impact.tone === "warning"
                          ? "Atenção"
                          : "Crítico"}
                    </Pill>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Projeção de receita por cenário"
              description="Comparação dos próximos 4 meses com dados simulados."
            >
              <ResultsChart />
            </Panel>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.success("Cenário salvo em Simulações")}>
                <Save className="size-4" />
                Salvar cenário
              </Button>
              <Button
                variant="outline"
                onClick={() => toast("Comparação de alternativas em preparação")}
              >
                <Scale className="size-4" />
                Comparar alternativas
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
