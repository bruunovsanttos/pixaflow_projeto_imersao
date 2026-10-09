import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { useCurrentCompany } from "./use-identity";
import { loadCompanyData, selectCompanyData, type CompanyPageLoader } from "@/lib/api/company-data";

/** Uses the central company UUID without changing resource pages or filters. */
export function useCompanyData<T>(
  resource: "risks" | "opportunities" | "timeline",
  loadPage: CompanyPageLoader<T>,
  schema: z.ZodType<T[]>,
  fallback: T[],
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const company = useCurrentCompany();
  const companyId = company.data?.id ?? "";
  const query = useQuery({
    queryKey: ["company-api", companyId, resource],
    queryFn: () => loadCompanyData(companyId, loadPage, schema),
    enabled: mounted && !!companyId && !company.isError,
    retry: false,
    networkMode: "always",
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  return {
    ...selectCompanyData(query.data, company.isError || query.isError, fallback),
    isFetching: company.isFetching || query.isFetching,
    error: company.error ?? query.error,
    retry: () => {
      if (company.isError) void company.refetch();
      else void query.refetch();
    },
  };
}
