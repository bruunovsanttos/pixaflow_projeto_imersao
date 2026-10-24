import { z } from "zod";
import { get } from "./client";
export const snapshotSchema = z.object({
  id: z.string(),
  reference_date: z.string(),
  created_at: z.string(),
  model_version: z.string(),
  stale: z.boolean(),
  result: z.object({
    period_start: z.string(),
    period_end: z.string(),
    coverage_days: z.number(),
    required_days: z.number(),
    health: z.number().min(0).max(100).nullable(),
    efficiency: z.number().min(0).max(100).nullable(),
    revenue_actual: z.string(),
    revenue_forecast: z.string().nullable(),
    forecast_days: z.number(),
    forecast_start: z.string(),
    forecast_end: z.string(),
    limitations: z.array(z.string()),
    trend: z.array(z.object({ date: z.string(), score: z.number().nullable() })),
  }),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export type DailyRecord = {
  record_date: string;
  revenue: string;
  planned: number;
  completed: number;
  on_time: number;
  available_minutes: number;
  productive_minutes: number;
  revision: number;
  note: string;
};
export async function getLatest(companyId: string) {
  return snapshotSchema.nullable().parse(await get(`/companies/${companyId}/analytics/latest`));
}
export const money = (value: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
export function brazilDate(offset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
