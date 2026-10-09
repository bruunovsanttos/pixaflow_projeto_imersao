import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/nexora/AppShell";
import { RiskCard } from "@/components/nexora/cards";
import { EmptyState, PageHeader, Pill } from "@/components/nexora/primitives";
import { currency, risks as mockRisks } from "@/lib/mock-data";
import { DataSourceStatus } from "@/components/nexora/DataSourceStatus";
import { useCompanyData } from "@/hooks/use-company-data";
import { getRisks } from "@/lib/api/risks";
import { riskListSchema } from "@/lib/api/company-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/riscos")({
  head: () => ({
    meta: [
      { title: "Central de Riscos — NEXORA" },
      {
        name: "description",
        content: "Antecipe problemas de estoque, caixa, operação e pessoas antes que aconteçam.",
      },
      { property: "og:title", content: "Central de Riscos — NEXORA" },
      {
        property: "og:description",
        content: "Antecipe problemas antes que eles afetem sua operação.",
      },
    ],
  }),
  component: RisksPage,
});

const filters = [
  "Todos",
  "Críticos",
  "Moderados",
  "Financeiro",
  "Estoque",
  "Operação",
  "Pessoas",
] as const;

function RisksPage() {
  const resource = useCompanyData("risks", getRisks, riskListSchema, mockRisks);
  const risks = resource.data;
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");

  const filtered = risks.filter((r) => {
    if (filter === "Todos") return true;
    if (filter === "Críticos") return r.severity === "critico";
    if (filter === "Moderados") return r.severity === "atencao";
    return r.category === filter;
  });

  const totalImpact = filtered.reduce((acc, r) => acc + r.impact, 0);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl" aria-busy={resource.source === "loading"}>
        <PageHeader
          eyebrow="Riscos"
          title="Central de Riscos"
          description="Antecipe problemas antes que eles afetem sua operação."
          actions={
            <div className="flex gap-2">
              <Pill tone="danger">
                {risks.filter((r) => r.severity === "critico").length} críticos
              </Pill>
              <Pill tone="warning">Impacto exposto {currency(totalImpact)}</Pill>
            </div>
          }
        />

        <DataSourceStatus
          source={resource.source}
          isFetching={resource.isFetching}
          onRetry={resource.retry}
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {resource.source === "loading" ? null : filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="size-6" />}
            title="Nenhum risco neste filtro"
            description="A Nexora não encontrou riscos com esse critério nas próximas semanas."
          />
        ) : (
          <div className="grid gap-4">
            {filtered.map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
