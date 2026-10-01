import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, Pill } from "@/components/nexora/primitives";
import { currency, decisionOptions, type SimulationResult } from "@/lib/mock-data";
export function SimulationResultView({ result }: { result: SimulationResult }) {
  const { baseline, simulated } = result;
  const rows = [
    {
      label: "Investimento no período",
      before: currency(baseline.investment),
      after: currency(simulated.investment),
    },
    { label: "Clientes previstos", before: baseline.clients, after: simulated.clients },
    {
      label: "Receita prevista",
      before: currency(baseline.revenue),
      after: currency(simulated.revenue),
    },
    {
      label: "Ocupação da capacidade",
      before: `${baseline.capacity}%`,
      after: `${simulated.capacity}%`,
    },
  ];
  return (
    <div className="space-y-4">
      <Panel
        title="Antes e depois da decisão"
        description={`Horizonte: ${result.horizon}. Valores ilustrativos para o mesmo período.`}
      >
        <p className="mb-4 break-words text-sm text-muted-foreground">
          {result.input.question || decisionOptions.find((o) => o.id === result.input.kind)?.label}
        </p>
        <div className="grid grid-cols-[minmax(0,1.3fr)_1fr_1fr] gap-2 border-b pb-3 text-sm font-semibold">
          <span>Indicador</span>
          <span>Atual</span>
          <span>Simulado</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1.3fr)_1fr_1fr] gap-2 border-b py-3 text-xs sm:text-sm"
          >
            <span>{row.label}</span>
            <span>{row.before}</span>
            <strong>{row.after}</strong>
          </div>
        ))}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Variação de receita</p>
            <strong>{currency(simulated.revenue - baseline.revenue)}</strong>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Custo adicional no período</p>
            <strong>{currency(result.additionalCost)}</strong>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo incremental estimado</p>
            <strong>{currency(result.incrementalBalance)}</strong>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Saldo = receita adicional − custo adicional; não representa lucro líquido. Capital de
          abertura separado: {currency(result.initialCapital)}.
        </p>
      </Panel>
      <Panel
        title={
          simulated.capacity > 100
            ? "A demanda ultrapassa a capacidade"
            : "Capacidade dentro do limite simulado"
        }
      >
        <Pill tone={simulated.capacity > 100 ? "danger" : "success"}>
          {simulated.capacity}% de ocupação
        </Pill>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm">
          {result.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">Premissa: {result.assumption}</p>
      </Panel>
      <Panel
        title="Receita e investimento"
        description={`Comparação no horizonte de ${result.horizon}.`}
      >
        <div
          className="h-64 w-full"
          role="img"
          aria-label={`Receita atual ${currency(baseline.revenue)}, simulada ${currency(simulated.revenue)}. Valores também disponíveis na tabela acima.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { label: "Receita", atual: baseline.revenue, simulado: simulated.revenue },
                {
                  label: "Investimento",
                  atual: baseline.investment,
                  simulado: simulated.investment,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="4 6" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis width={55} tickFormatter={(v: number) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => currency(v)} />
              <Legend />
              <Bar
                name="Atual"
                dataKey="atual"
                fill="var(--color-muted-foreground)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                name="Simulado"
                dataKey="simulado"
                fill="var(--color-primary)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
