import { DataSourceStatus } from "./DataSourceStatus";
import { Button } from "@/components/ui/button";
import type { DataSource } from "@/lib/api/company-data";

/** Reuse resource loading/retry behavior, but never substitute demo data on the dashboard. */
export function DashboardDataStatus({
  label,
  resource,
}: {
  label: string;
  resource: { source: DataSource | string; isFetching: boolean; retry: () => void };
}) {
  if (resource.source !== "mock")
    return (
      <DataSourceStatus
        source={resource.source as DataSource}
        isFetching={resource.isFetching}
        onRetry={resource.retry}
      />
    );
  return (
    <div
      role="status"
      aria-live="polite"
      data-source="error"
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
    >
      <span>{label}: dados indisponíveis. Não foi possível consultar a API.</span>
      <Button variant="outline" size="sm" onClick={resource.retry} disabled={resource.isFetching}>
        {resource.isFetching ? "Tentando novamente…" : "Tentar novamente"}
      </Button>
    </div>
  );
}
