import { get } from "./client";
import { adaptCompany } from "./adapters";
import type { CompanyDTO, Pagination } from "./types";
export async function getCompanies(filters: Pagination = {}) {
  return (await get<CompanyDTO[]>("/companies", { ...filters })).map(adaptCompany);
}
export async function getCompany(companyId: string) {
  return adaptCompany(await get<CompanyDTO>(`/companies/${encodeURIComponent(companyId)}`));
}
