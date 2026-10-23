import { z } from "zod";
import { get, post, remove, ApiError } from "./client";
import type { SimulationResult, SavedScenario } from "../mock-data";
const decimal = z
  .union([z.string().min(1), z.number()])
  .transform(Number)
  .pipe(z.number().finite());
const metrics = z.object({
  variant: z.enum(["baseline", "simulated"]),
  investment: decimal,
  clients: z.number().int(),
  revenue: decimal,
  capacity: decimal,
});
const simulation = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  decision_kind: z.enum(["marketing", "stock", "hire", "price", "unit", "opportunity"]),
  amount: z.number().int(),
  question: z.string(),
  opportunity_id: z.string().uuid().nullable(),
  horizon_days: z.number().int().positive(),
  model_version: z.string(),
  assumption: z.string(),
  additional_cost: decimal,
  initial_capital: decimal,
  incremental_balance: decimal,
  metrics: z
    .array(metrics)
    .length(2)
    .refine((items) => new Set(items.map((m) => m.variant)).size === 2),
  recommendations: z.array(z.object({ position: z.number().int(), text: z.string() })),
});
const saved = z.object({
  id: z.string().uuid(),
  simulation_id: z.string().uuid(),
  membership_id: z.string().uuid(),
  created_at: z.string(),
});
export type RemoteScenario = SavedScenario & { result: SimulationResult; modelVersion: string };
export function adaptSimulation(
  raw: unknown,
  companyId: string,
): { result: SimulationResult; id: string; modelVersion: string } {
  const dto = simulation.parse(raw);
  if (dto.company_id !== companyId) throw new Error("Simulação de outra empresa.");
  const values = (variant: "baseline" | "simulated") => {
    const item = dto.metrics.find((m) => m.variant === variant)!;
    return {
      investment: item.investment,
      clients: item.clients,
      revenue: item.revenue,
      capacity: item.capacity,
    };
  };
  return {
    id: dto.id,
    modelVersion: dto.model_version,
    result: {
      input: {
        kind: dto.decision_kind,
        amount: dto.amount,
        question: dto.question,
        ...(dto.opportunity_id ? { opportunityId: dto.opportunity_id } : {}),
      },
      baseline: values("baseline"),
      simulated: values("simulated"),
      additionalCost: dto.additional_cost,
      initialCapital: dto.initial_capital,
      incrementalBalance: dto.incremental_balance,
      horizon: `${dto.horizon_days} dias`,
      assumption: dto.assumption,
      recommendations: [...dto.recommendations]
        .sort((a, b) => a.position - b.position)
        .map((r) => r.text),
    },
  };
}
const base = (companyId: string) => `/companies/${z.string().uuid().parse(companyId)}`;
export function simulationPayload(result: SimulationResult, membershipId: string) {
  const now = new Date();
  return {
    decision_kind: result.input.kind,
    amount: result.input.amount,
    question: result.input.question,
    reference_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    horizon_days: Number.parseInt(result.horizon, 10),
    model_version: "demo-rules-v2",
    assumption: result.assumption,
    additional_cost: result.additionalCost,
    initial_capital: result.initialCapital,
    incremental_balance: result.incrementalBalance,
    created_by_membership_id: z.string().uuid().parse(membershipId),
    opportunity_id: result.input.kind === "opportunity" ? result.input.opportunityId : null,
    baseline: result.baseline,
    simulated: result.simulated,
    recommendations: result.recommendations,
  };
}
export async function createSimulation(
  companyId: string,
  membershipId: string,
  result: SimulationResult,
) {
  return adaptSimulation(
    await post(`${base(companyId)}/simulations`, simulationPayload(result, membershipId)),
    companyId,
  ).id;
}
export async function listRemoteScenarios(
  companyId: string,
  membershipId: string,
): Promise<RemoteScenario[]> {
  const records: z.infer<typeof saved>[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = z.array(saved).parse(
      await get(`${base(companyId)}/saved-scenarios`, {
        membership_id: membershipId,
        offset,
        limit: 100,
      }),
    );
    if (page.some((item) => item.membership_id !== membershipId))
      throw new Error("Cenário de outro vínculo.");
    records.push(...page);
    if (page.length < 100) break;
  }
  const results: RemoteScenario[] = [];
  // Small batches avoid flooding the API for large histories.
  for (let offset = 0; offset < records.length; offset += 5) {
    results.push(
      ...(await Promise.all(
        records.slice(offset, offset + 5).map(async (item) => {
          const value = adaptSimulation(
            await get(`${base(companyId)}/simulations/${item.simulation_id}`),
            companyId,
          );
          if (value.id !== item.simulation_id) throw new Error("Simulação inconsistente.");
          return {
            id: item.id,
            createdAt: item.created_at,
            input: value.result.input,
            result: value.result,
            modelVersion: value.modelVersion,
          };
        }),
      )),
    );
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function bookmarkSimulation(
  companyId: string,
  membershipId: string,
  simulationId: string,
) {
  try {
    saved.parse(
      await post(`${base(companyId)}/saved-scenarios`, {
        membership_id: membershipId,
        simulation_id: simulationId,
      }),
    );
  } catch (error) {
    // A retry after an uncertain response may find the bookmark already created.
    if (!(error instanceof ApiError) || error.status !== 409) throw error;
    for (let offset = 0; ; offset += 100) {
      const records = z.array(saved).parse(
        await get(`${base(companyId)}/saved-scenarios`, {
          membership_id: membershipId,
          offset,
          limit: 100,
        }),
      );
      if (
        records.some(
          (item) => item.membership_id === membershipId && item.simulation_id === simulationId,
        )
      )
        return;
      if (records.length < 100) throw error;
    }
  }
}
export function deleteRemoteScenario(companyId: string, id: string) {
  return remove(`${base(companyId)}/saved-scenarios/${z.string().uuid().parse(id)}`);
}
