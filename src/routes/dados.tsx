import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/nexora/AppShell";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { useCurrentCompany } from "@/hooks/use-identity";
import { useAnalytics } from "@/hooks/use-analytics";
import { get, put, post } from "@/lib/api/client";
import { brazilDate, money, snapshotSchema, type DailyRecord } from "@/lib/api/analytics";
export const Route = createFileRoute("/dados")({ component: DailyData });
const fields = [
  ["revenue", "Receita realizada (R$)"],
  ["planned", "Tarefas previstas"],
  ["completed", "Tarefas concluídas"],
  ["on_time", "Concluídas no prazo"],
  ["available_minutes", "Minutos disponíveis da equipe"],
  ["productive_minutes", "Minutos produtivos da equipe"],
] as const;
function DailyData() {
  const company = useCurrentCompany();
  const session = useSession();
  const client = useQueryClient();
  const analysis = useAnalytics();
  const [day, setDay] = useState(brazilDate(-1));
  const [reference, setReference] = useState(brazilDate(-1));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const id = company.data?.id;
  const base = `/companies/${id}`;
  const role = session.data?.memberships.find((m) => m.company_id === id)?.role;
  const canWrite = role === "admin" || role === "operator";
  const records = useQuery({
    queryKey: ["daily", id, day],
    queryFn: () => get<DailyRecord[]>(`${base}/daily-data`, { start: day, end: day }),
    enabled: !!id,
    retry: false,
  });
  const history = useQuery({
    queryKey: ["analysis-history", id],
    queryFn: async () => snapshotSchema.array().parse(await get(`${base}/analytics/history`)),
    enabled: !!id,
    retry: false,
  });
  const audit = useQuery({
    queryKey: ["daily-history", id, day],
    queryFn: () =>
      get<{ revision: number; created_at: string; values: Record<string, unknown> }[]>(
        `${base}/daily-data/${day}/history`,
      ),
    enabled: !!id,
    retry: false,
  });
  const row = records.data?.[0];
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["daily"] }),
      client.invalidateQueries({ queryKey: ["daily-history"] }),
      client.invalidateQueries({ queryKey: ["analytics"] }),
      client.invalidateQueries({ queryKey: ["analysis-history"] }),
    ]);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !id) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const values = Object.fromEntries(
        fields.map(([key]) => [
          key,
          key === "revenue" ? String(form.get(key)) : Number(form.get(key)),
        ]),
      );
      await put(`${base}/daily-data/${day}`, {
        ...values,
        note: form.get("note"),
        expected_revision: row?.revision ?? 0,
      });
      await refresh();
      setMessage("Dados salvos. Gere uma análise para atualizar os indicadores.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    setBusy(true);
    setMessage("");
    try {
      await post(`${base}/analytics`, { reference_date: reference });
      await refresh();
      setMessage("Análise salva e disponível na Visão Geral.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-semibold">Dados diários</h1>
        <p className="text-muted-foreground">
          Informe os totais realizados pela empresa. Inclua dias sem atividade com valores zero. O
          dia usa o horário de Brasília. Não preencha valores estimados.
        </p>
        {!canWrite && <p>Seu perfil permite somente consulta.</p>}
        {message && (
          <p role="status" className="rounded-xl border bg-card p-4">
            {message}
          </p>
        )}
        {company.isError && (
          <Button onClick={() => void company.refetch()}>Tentar carregar empresa novamente</Button>
        )}
        <section className="rounded-2xl border bg-card p-6">
          <Button
            variant="outline"
            disabled={busy || records.isFetching}
            onClick={() => void records.refetch()}
          >
            Recarregar dia
          </Button>
          <label className="block mb-4">
            Dia do registro
            <input
              type="date"
              value={day}
              max={brazilDate()}
              onChange={(e) => {
                if (e.target.value) setDay(e.target.value);
              }}
              className="ml-3 rounded border p-2"
            />
          </label>
          {records.isPending ? (
            <p role="status">Carregando dados…</p>
          ) : records.isError ? (
            <>
              <p role="alert">{records.error.message}</p>
              <Button onClick={() => void records.refetch()}>Tentar novamente</Button>
            </>
          ) : (
            <form key={`${day}-${row?.revision ?? 0}`} onSubmit={save}>
              <fieldset
                disabled={!canWrite || busy || records.isFetching}
                className="grid gap-4 sm:grid-cols-2"
              >
                {fields.map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <input
                      name={key}
                      type="number"
                      min="0"
                      max={
                        key === "revenue"
                          ? undefined
                          : key.includes("minutes")
                            ? 100000000
                            : 1000000
                      }
                      step={key === "revenue" ? "0.01" : "1"}
                      defaultValue={row?.[key] ?? ""}
                      required
                      className="mt-1 block w-full rounded-lg border p-3"
                    />
                  </label>
                ))}
                <label className="sm:col-span-2 text-sm">
                  Observação
                  <textarea
                    name="note"
                    maxLength={500}
                    defaultValue={row?.note ?? ""}
                    className="mt-1 block w-full rounded-lg border p-3"
                  />
                </label>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  No prazo ≤ concluídas ≤ previstas. Tempo produtivo ≤ disponível. Some os minutos
                  de toda a equipe.{" "}
                  {row
                    ? `Revisão ${row.revision}. Salvar preserva a versão anterior no histórico.`
                    : "Novo registro."}
                </p>
                <Button type="submit">{busy ? "Salvando…" : "Salvar dia"}</Button>
              </fieldset>
            </form>
          )}
          <details className="mt-4">
            <summary>Histórico de alterações deste dia</summary>
            {audit.isError ? (
              <Button onClick={() => void audit.refetch()}>Tentar carregar histórico</Button>
            ) : audit.data?.length ? (
              audit.data.map((a) => (
                <p key={a.revision} className="mt-2 text-sm">
                  Revisão {a.revision} · {new Date(a.created_at).toLocaleString("pt-BR")} · Receita{" "}
                  {String(a.values["revenue"])} · Tarefas {String(a.values["on_time"])}/
                  {String(a.values["planned"])} · Minutos {String(a.values["productive_minutes"])}/
                  {String(a.values["available_minutes"])}
                </p>
              ))
            ) : (
              <p>Sem alterações registradas.</p>
            )}
          </details>
        </section>
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Gerar análise</h2>
          <p className="text-sm">
            Janela de 28 dias até a referência. Saúde = tarefas no prazo / previstas. Eficiência =
            minutos produtivos / disponíveis. Receita estimada = média diária de 28 dias completos ×
            30. Sem denominador ou histórico suficiente, o indicador fica indisponível.
          </p>
          <label>
            Data de referência
            <input
              type="date"
              max={brazilDate(-1)}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="ml-3 rounded border p-2"
            />
          </label>
          <Button
            className="ml-3"
            disabled={!canWrite || busy || !reference || !id}
            onClick={() => void run()}
          >
            Gerar e salvar análise
          </Button>
          {analysis.data && (
            <p className="text-sm">
              Última análise: {analysis.data.reference_date} · {analysis.data.result.coverage_days}
              /28 dias registrados{analysis.data.stale ? " · Dados alterados: gere novamente." : ""}
            </p>
          )}
          <h3 className="font-semibold">Análises salvas</h3>
          {history.isError ? (
            <>
              <p role="alert">{history.error.message}</p>
              <Button onClick={() => void history.refetch()}>Tentar novamente</Button>
            </>
          ) : history.data?.length ? (
            history.data.map((s) => (
              <details key={s.id} className="rounded-lg border p-3">
                <summary>
                  Referência {s.reference_date} · {s.result.coverage_days}/28 dias
                  {s.stale ? " · Dados alterados" : ""}
                </summary>
                <p className="mt-2 text-sm">
                  Saúde: {s.result.health ?? "—"} · Eficiência: {s.result.efficiency ?? "—"}% ·
                  Receita estimada:{" "}
                  {s.result.revenue_forecast === null
                    ? "Histórico insuficiente"
                    : money(s.result.revenue_forecast)}
                </p>
                <p className="text-xs">
                  Modelo {s.model_version} · Gerada em{" "}
                  {new Date(s.created_at).toLocaleString("pt-BR")}. {s.result.limitations.join(" ")}
                </p>
              </details>
            ))
          ) : (
            <p>Nenhuma análise salva.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
