import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert, Zap } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/nexora/AppShell";
import {
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  severityDot,
  severityLabel,
  severityTone,
} from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { timeline as mockTimeline } from "@/lib/mock-data";
import { DataSourceStatus } from "@/components/nexora/DataSourceStatus";
import { useCompanyData } from "@/hooks/use-company-data";
import { getTimelineEvents } from "@/lib/api/timeline";
import { timelineListSchema, formatTimelineDate } from "@/lib/api/company-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/linha-do-tempo")({
  head: () => ({
    meta: [
      { title: "Linha do Tempo — NEXORA" },
      {
        name: "description",
        content: "Eventos previstos para a sua operação nas próximas semanas, dia a dia.",
      },
      { property: "og:title", content: "Linha do Tempo — NEXORA" },
      {
        property: "og:description",
        content: "Acompanhe o futuro previsto da sua operação em uma única linha do tempo.",
      },
    ],
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const resource = useCompanyData("timeline", getTimelineEvents, timelineListSchema, mockTimeline);
  const timeline = resource.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = timeline.find((event) => event.id === selectedId) ?? null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl" aria-busy={resource.source === "loading"}>
        <PageHeader
          eyebrow="Linha do Tempo"
          title="Linha do tempo do futuro"
          description="Os eventos abaixo são projeções da Nexora com base nos padrões da sua operação. Clique em um evento para ver causa, impacto e recomendações."
          actions={
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success" /> Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-warning" /> Atenção
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-danger" /> Crítico
              </span>
            </div>
          }
        />

        <DataSourceStatus
          source={resource.source}
          isFetching={resource.isFetching}
          onRetry={resource.retry}
        />
        {resource.source === "loading" ? null : timeline.length === 0 ? (
          <EmptyState
            icon={<CircleAlert className="size-6" />}
            title="Nenhum evento previsto"
            description="Não há eventos previstos para esta empresa."
          />
        ) : (
          <Panel>
            <ol className="relative space-y-1 pl-8">
              <span className="absolute bottom-4 left-[7px] top-4 w-px bg-border" />
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-8 top-5 size-3.5 rounded-full ring-4 ring-card",
                      severityDot[event.severity],
                    )}
                  />
                  <button
                    onClick={() => setSelectedId(event.id)}
                    className="w-full rounded-xl border border-transparent px-4 py-4 text-left transition-all duration-200 hover:border-border hover:bg-accent/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatTimelineDate(event.date)}
                      </span>
                      <Pill tone={severityTone[event.severity]}>
                        {severityLabel[event.severity]}
                      </Pill>
                    </div>
                    <p className="mt-1 text-base font-semibold">{event.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                  </button>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Pill tone={severityTone[selected.severity]}>
                    {severityLabel[selected.severity]}
                  </Pill>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatTimelineDate(selected.date)}
                  </span>
                </div>
                <SheetTitle className="text-left">{selected.title}</SheetTitle>
                <SheetDescription className="text-left">{selected.description}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-6 text-sm">
                <div className="rounded-xl bg-muted/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Causa provável
                  </p>
                  <p className="mt-1">{selected.cause}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CircleAlert className="size-3.5" /> Impacto
                  </p>
                  <p className="mt-1">{selected.impact}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recomendações
                  </p>
                  <ul className="mt-2 space-y-2">
                    {selected.recommendations.map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button asChild className="w-full">
                  <Link to="/simulador" search={{ q: `Como resolver: ${selected.title}` }}>
                    Simular solução
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
