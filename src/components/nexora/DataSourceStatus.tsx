import { Button } from "@/components/ui/button";
import type { DataSource } from "@/lib/api/company-data";

export function DataSourceStatus({
  source,
  isFetching,
  onRetry,
}: {
  source: DataSource;
  isFetching: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-source={source}
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
    >
      <span>
        {source === "loading"
          ? "Carregando dados…"
          : source === "mock"
            ? "Não foi possível atualizar os dados. Exibindo dados de demonstração."
            : "Dados atualizados da empresa."}
        {source !== "loading" && isFetching ? " Atualizando…" : ""}
      </span>
      {source === "mock" ? (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
          {isFetching ? "Tentando novamente…" : "Tentar novamente"}
        </Button>
      ) : null}
    </div>
  );
}
