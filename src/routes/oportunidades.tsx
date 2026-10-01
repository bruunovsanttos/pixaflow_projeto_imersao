import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/nexora/AppShell";
import { OpportunityCard } from "@/components/nexora/cards";
import { EmptyState, PageHeader, Pill } from "@/components/nexora/primitives";
import { currency, opportunities } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oportunidades")({
  head: () => ({
    meta: [
      { title: "Oportunidades — NEXORA" },
      {
        name: "description",
        content: "Ganhos de receita e eficiência detectados nos padrões da sua operação.",
      },
      { property: "og:title", content: "Oportunidades — NEXORA" },
      {
        property: "og:description",
        content: "A Nexora encontrou oportunidades que podem estar passando despercebidas.",
      },
    ],
  }),
  component: OpportunitiesPage,
});

const filters = ["Todas", "Baixo esforço", "Médio esforço", "Alto esforço"] as const;

function OpportunitiesPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todas");

  const filtered = opportunities.filter((o) => {
    if (filter === "Todas") return true;
    return `${o.effort} esforço` === filter;
  });

  const total = opportunities.reduce((acc, o) => acc + o.potentialRevenue, 0);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          eyebrow="Oportunidades"
          title="Oportunidades"
          description="Potenciais ilustrativos em diferentes prazos. Não some os valores: as ações podem se sobrepor."
          actions={
            <div className="flex gap-2">
              <Pill tone="insight">{opportunities.length} detectadas</Pill>
              <Pill tone="success">Potenciais por ação</Pill>
            </div>
          }
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

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="size-6" />}
            title="Nenhuma oportunidade neste filtro"
            description="Ajuste o filtro de esforço para ver outras oportunidades detectadas."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
