import { get } from "./client";
import { adaptRisk } from "./adapters";
import type { RiskDTO, RiskFilters } from "./types";
export async function getRisks(companyId: string, filters: RiskFilters = {}) {
  return (
    await get<RiskDTO[]>(`/companies/${encodeURIComponent(companyId)}/risks`, { ...filters })
  ).map(adaptRisk);
}
export async function getRisk(companyId: string, id: string) {
  return adaptRisk(
    await get<RiskDTO>(
      `/companies/${encodeURIComponent(companyId)}/risks/${encodeURIComponent(id)}`,
    ),
  );
}
