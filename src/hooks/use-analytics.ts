import { useQuery } from "@tanstack/react-query";
import { useCurrentCompany } from "./use-identity";
import { getLatest } from "@/lib/api/analytics";
export function useAnalytics() {
  const company = useCurrentCompany();
  return useQuery({
    queryKey: ["analytics", company.data?.id],
    queryFn: () => getLatest(company.data!.id),
    enabled: !!company.data && !company.isError,
    retry: false,
  });
}
