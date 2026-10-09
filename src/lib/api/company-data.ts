import { z } from "zod";
import type { Pagination } from "./types";
import type { Risk, Opportunity, TimelineEvent } from "../mock-data";

const severity = z.enum(["normal", "atencao", "critico"]);
const base = { id: z.string().uuid(), title: z.string(), description: z.string() };
const recommendations = z.array(z.string());
export const riskListSchema: z.ZodType<Risk[]> = z.array(
  z
    .object({
      ...base,
      category: z.enum(["Financeiro", "Estoque", "Operação", "Pessoas"]),
      detail: z.string(),
      cause: z.string(),
      probability: z.number().finite(),
      impact: z.number().finite(),
      deadline: z.string(),
      status: z.enum(["Ativo", "Em análise", "Monitorando"]),
      severity,
      recommendations,
    })
    .passthrough(),
);
export const opportunityListSchema: z.ZodType<Opportunity[]> = z.array(
  z
    .object({
      ...base,
      action: z.string(),
      potentialRevenue: z.number().finite(),
      cost: z.number().finite(),
      roi: z.number().finite().nullable(),
      extraClients: z.number().int(),
      effort: z.enum(["Baixo", "Médio", "Alto"]),
      horizon: z.string(),
      confidence: z.number().finite(),
    })
    .passthrough(),
);
export const timelineListSchema: z.ZodType<TimelineEvent[]> = z.array(
  z
    .object({
      ...base,
      date: z.string().date(),
      severity,
      cause: z.string(),
      impact: z.string(),
      recommendations,
    })
    .passthrough(),
);

export type CompanyPageLoader<T> = (companyId: string, filters: Pagination) => Promise<T[]>;
export type DataSource = "loading" | "api" | "mock";
const PAGE_SIZE = 100;

/** Bound the whole operation, including pagination.
 * Late requests cannot replace fallback data or start another page after timeout.
 */
export async function loadCompanyData<T>(
  companyId: string,
  loadPage: CompanyPageLoader<T>,
  schema: z.ZodType<T[]>,
  timeoutMs = 10000,
): Promise<T[]> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Tempo limite ao carregar os dados."));
    }, timeoutMs);
  });
  const load = async () => {
    z.string().uuid().parse(companyId);
    const result: T[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      controller.signal.throwIfAborted();
      const page = schema.parse(await loadPage(companyId, { offset, limit: PAGE_SIZE }));
      controller.signal.throwIfAborted();
      result.push(...page);
      if (page.length < PAGE_SIZE) return result;
    }
  };
  try {
    return await Promise.race([load(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** An empty successful response is real data, never a reason to show mocks. */
export function selectCompanyData<T>(
  data: T[] | undefined,
  isError: boolean,
  fallback: T[],
): { data: T[]; source: DataSource } {
  if (isError) return { data: fallback, source: "mock" };
  if (data !== undefined) return { data, source: "api" };
  return { data: [], source: "loading" };
}

/** Calendar dates have no timezone; keep legacy mock labels unchanged. */
export function formatTimelineDate(date: string): string {
  return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3/$2/$1");
}

/** Presentation only: keep the original numeric ROI unchanged for calculations. */
export function opportunityLabels(opportunity: Opportunity): { roi: string; benefit: string } {
  return {
    roi:
      opportunity.roi === null
        ? "Não aplicável"
        : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(opportunity.roi)}%`,
    benefit:
      "benefitType" in opportunity && opportunity.benefitType === "cost_saving"
        ? "Economia"
        : "Receita",
  };
}
