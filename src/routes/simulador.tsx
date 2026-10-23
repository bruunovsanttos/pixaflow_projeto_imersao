import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Scale, Sparkles, Trash2 } from "lucide-react";
import { SimulationResultView } from "@/components/nexora/SimulationResultView";
import { toast } from "sonner";
import { AppShell } from "@/components/nexora/AppShell";
import { EmptyState, PageHeader, Panel } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateSimulation,
  decisionOptions,
  suggestDecision,
  type DecisionKind,
  type SimulationInput,
  type SimulationResult,
} from "@/lib/mock-data";

import { useQuery } from "@tanstack/react-query";
import { useIdentity } from "@/hooks/use-identity";
import { useCompanyData } from "@/hooks/use-company-data";
import { getOpportunities } from "@/lib/api/opportunities";
import { opportunityListSchema } from "@/lib/api/company-data";
import { DashboardDataStatus } from "@/components/nexora/DashboardDataStatus";
import {
  createSimulation,
  bookmarkSimulation,
  listRemoteScenarios,
  deleteRemoteScenario,
} from "@/lib/api/scenarios";

export const Route = createFileRoute("/simulador")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" ? { q: search["q"].slice(0, 2000) } : {},
  head: () => ({ meta: [{ title: "Simulador de Decisões — NEXORA" }] }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const { q } = Route.useSearch();
  const identity = useIdentity();
  const companyId = identity.identity?.company.id;
  const membershipId = identity.identity?.membership.id;
  const opportunityResource = useCompanyData(
    "opportunities",
    getOpportunities,
    opportunityListSchema,
    [],
  );
  const opportunities = opportunityResource.source === "api" ? opportunityResource.data : [];
  const history = useQuery({
    queryKey: ["saved-scenarios", companyId, membershipId],
    queryFn: () => listRemoteScenarios(companyId!, membershipId!),
    enabled: !!companyId && !!membershipId,
    retry: false,
    networkMode: "always",
    staleTime: 0,
  });
  const saved = history.data ?? [];
  const pending = useRef<{ result: SimulationResult; id: string } | null>(null);
  const saveLock = useRef(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [question, setQuestion] = useState(q ?? "");
  const [kind, setKind] = useState<DecisionKind>(suggestDecision(q ?? ""));
  const [amount, setAmount] = useState(
    () => decisionOptions.find((o) => o.id === suggestDecision(q ?? ""))!.initial as number,
  );
  const [opportunityId, setOpportunityId] = useState(
    () => opportunities.find((o) => o.action === q)?.id ?? opportunities[0]?.id ?? "",
  );
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  const option = decisionOptions.find((o) => o.id === kind)!;
  useEffect(() => {
    const nextKind = suggestDecision(q ?? "");
    setQuestion(q ?? "");
    setKind(nextKind);
    setAmount(decisionOptions.find((o) => o.id === nextKind)!.initial);
    setOpportunityId("");
    setResult(null);
  }, [q]);
  const effectiveOpportunityId = opportunities.some((o) => o.id === opportunityId)
    ? opportunityId
    : (opportunities.find((o) => o.action === q)?.id ?? opportunities[0]?.id ?? "");
  function changeKind(next: DecisionKind) {
    setKind(next);
    setAmount(decisionOptions.find((o) => o.id === next)!.initial);
    setResult(null);
  }
  async function simulate() {
    setBusy(true);
    setError("");
    setResult(null);
    const input: SimulationInput = {
      kind,
      amount,
      question,
      opportunityId: effectiveOpportunityId,
    };
    try {
      setResult(calculateSimulation(input, opportunities));
      pending.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível simular. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!result || saveLock.current || !companyId || !membershipId) return;
    saveLock.current = true;
    setSaving(true);
    try {
      if (pending.current?.result !== result) {
        const id = await createSimulation(companyId, membershipId, result);
        pending.current = { result, id };
      }
      await bookmarkSimulation(companyId, membershipId, pending.current.id);
      toast.success("Cenário salvo na empresa");
      await history.refetch();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Atualize o histórico antes de tentar novamente.",
      );
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  }
  async function remove(id: string) {
    if (!companyId || deleting) return;
    setDeleting(id);
    try {
      await deleteRemoteScenario(companyId, id);
      setSelected((prev) => prev.filter((item) => item !== id));
      setCompare(false);
      await history.refetch();
      toast.success("Cenário removido do histórico");
    } catch {
      toast.error("Não foi possível remover o cenário.");
    } finally {
      setDeleting(null);
    }
  }
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <PageHeader
          eyebrow="Simulações"
          title="Simulador de Decisões"
          description="Teste consequências, ajuste premissas e compare alternativas antes de agir."
        />
        <Panel
          title="Qual decisão você quer testar?"
          description="Modelo demonstrativo por regras, com base ilustrativa. Oportunidades vêm da empresa; os demais parâmetros são exemplos. O texto não é interpretado por IA."
        >
          <fieldset disabled={busy || saving} className="space-y-4">
            <Label htmlFor="decision">Descrição da decisão (opcional)</Label>
            <Textarea
              id="decision"
              maxLength={2000}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setResult(null);
              }}
              placeholder="Ex.: aumentar o investimento em marketing em 30%"
            />
            <div className="flex flex-wrap gap-2">
              {decisionOptions.map((o) => (
                <Button
                  key={o.id}
                  size="sm"
                  variant={kind === o.id ? "default" : "outline"}
                  aria-pressed={kind === o.id}
                  onClick={() => changeKind(o.id)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
            {kind === "opportunity" && (
              <DashboardDataStatus label="Oportunidades" resource={opportunityResource} />
            )}
            {kind === "opportunity" && opportunities.length === 0 && (
              <p>Nenhuma oportunidade disponível para simular.</p>
            )}
            {kind === "opportunity" && (
              <div className="space-y-2">
                <Label htmlFor="opportunity">Oportunidade</Label>
                <select
                  id="opportunity"
                  className="w-full rounded-lg border bg-card p-3 text-sm"
                  value={effectiveOpportunityId}
                  onChange={(e) => {
                    setOpportunityId(e.target.value);
                    setResult(null);
                  }}
                >
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.horizon}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="max-w-sm space-y-2">
              <Label htmlFor="amount">
                Variação em {option.unit} ({option.min} a {option.max})
              </Label>
              <Input
                id="amount"
                type="number"
                min={option.min}
                max={option.max}
                step={1}
                value={Number.isNaN(amount) ? "" : amount}
                onChange={(e) => {
                  setAmount(e.target.valueAsNumber);
                  setResult(null);
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{option.assumption}</p>
            <Button
              onClick={simulate}
              disabled={busy || (kind === "opportunity" && !effectiveOpportunityId)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? "Calculando..." : "Simular decisão"}
            </Button>
          </fieldset>
        </Panel>
        {error && (
          <p role="alert" className="rounded-xl border border-danger p-4 text-sm text-danger">
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className="p-5 text-sm">
            Calculando os impactos da decisão...
          </p>
        )}
        {!result && !busy && (
          <EmptyState
            icon={<Scale />}
            title="Explore um futuro possível"
            description="Escolha uma decisão e altere suas premissas para ver os impactos."
          />
        )}
        {result && (
          <>
            <SimulationResultView result={result} />
            <DashboardDataStatus label="Identidade para salvar" resource={identity} />
            <Button onClick={save} disabled={saving || !companyId || !membershipId}>
              <Save className="size-4" />
              {saving ? "Salvando..." : "Salvar cenário"}
            </Button>
          </>
        )}
        <Panel
          title="Cenários salvos"
          description="Guardados na empresa para seu perfil. Resultados demonstrativos preservados no momento do salvamento; selecione dois com o mesmo horizonte para comparar."
        >
          {identity.source !== "api" && (
            <DashboardDataStatus label="Identidade" resource={identity} />
          )}
          {companyId && history.isPending && <p role="status">Carregando histórico…</p>}
          {history.isError && (
            <div role="alert">
              <p>Não foi possível carregar o histórico da empresa.</p>
              <Button
                variant="outline"
                disabled={history.isFetching}
                onClick={() => void history.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            disabled={!companyId || history.isFetching}
            onClick={() => void history.refetch()}
          >
            Atualizar histórico
          </Button>
          {!history.isPending && !history.isError && !saved.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cenário salvo. Simule uma decisão para começar.
            </p>
          ) : (
            <ul className="space-y-3">
              {saved.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <input
                    type="checkbox"
                    aria-label={`Comparar ${item.input.question || item.input.kind}`}
                    checked={selected.includes(item.id)}
                    disabled={!selected.includes(item.id) && selected.length >= 2}
                    onChange={(e) => {
                      setSelected((prev) =>
                        e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                      );
                      setCompare(false);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">
                      {item.input.question ||
                        decisionOptions.find((o) => o.id === item.input.kind)?.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.input.amount}{" "}
                      {decisionOptions.find((o) => o.id === item.input.kind)?.unit} ·{" "}
                      {item.result.horizon} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResult(item.result);
                      pending.current = null;
                    }}
                  >
                    Abrir
                  </Button>
                  <Button
                    disabled={!!deleting}
                    variant="ghost"
                    size="icon"
                    aria-label="Remover cenário"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            className="mt-4"
            variant="outline"
            disabled={selected.length !== 2}
            onClick={() => setCompare(true)}
          >
            <Scale className="size-4" />
            Comparar alternativas
          </Button>
          {compare &&
            selected.length === 2 &&
            (() => {
              const alternatives = saved
                .filter((item) => selected.includes(item.id))
                .map((item) => item.result);
              if (
                alternatives.length !== 2 ||
                alternatives[0]!.horizon !== alternatives[1]!.horizon
              )
                return (
                  <p role="alert" className="mt-4 text-sm text-warning">
                    Escolha cenários com o mesmo horizonte. Os períodos selecionados são diferentes.
                  </p>
                );
              return (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {alternatives.map((r, i) => (
                    <div key={selected[i]} className="min-w-0 rounded-xl border p-4">
                      <h3 className="mb-3 font-semibold">Alternativa {i + 1}</h3>
                      <SimulationResultView result={r} />
                    </div>
                  ))}
                </div>
              );
            })()}
        </Panel>
      </div>
    </AppShell>
  );
}
