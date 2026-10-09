import { get } from "./client";
import { adaptOpportunity } from "./adapters";
import type { OpportunityDTO, OpportunityFilters } from "./types";
export async function getOpportunities(companyId: string, filters: OpportunityFilters = {}) {
  return (
    await get<OpportunityDTO[]>(`/companies/${encodeURIComponent(companyId)}/opportunities`, {
      ...filters,
    })
  ).map(adaptOpportunity);
}
export async function getOpportunity(companyId: string, id: string) {
  return adaptOpportunity(
    await get<OpportunityDTO>(
      `/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(id)}`,
    ),
  );
}
