import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { companies, defaultSettings, getSettings } from "@/lib/mock-data";
import { loadCurrentCompany, loadIdentity } from "@/lib/api/identity";

export const currentCompanyKey = ["identity", "company"] as const;
export const identityKey = (companyId: string) => ["identity", "details", companyId] as const;
function useClientReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
export function useCurrentCompany() {
  const ready = useClientReady();
  return useQuery({
    queryKey: currentCompanyKey,
    queryFn: loadCurrentCompany,
    enabled: ready,
    retry: false,
    networkMode: "always",
    staleTime: 30000,
  });
}
export function useIdentity() {
  const ready = useClientReady();
  const queryClient = useQueryClient();
  const companyQuery = useCurrentCompany();
  const company = companyQuery.data;
  const details = useQuery({
    queryKey: identityKey(company?.id ?? ""),
    queryFn: () => {
      if (!company) throw new Error("Empresa ainda não carregada.");
      return loadIdentity(company);
    },
    enabled: ready && !!company && !companyQuery.isError,
    retry: false,
    networkMode: "always",
    staleTime: 30000,
    // Do not overwrite a settings draft when the browser regains focus.
    refetchOnWindowFocus: false,
  });
  const local = useQuery({
    queryKey: ["identity", "local-settings"],
    queryFn: getSettings,
    enabled: ready,
    retry: false,
    networkMode: "always",
    staleTime: Infinity,
  });
  useEffect(() => {
    const update = () => {
      void queryClient.invalidateQueries({ queryKey: ["identity", "local-settings"] });
    };
    window.addEventListener("nexora-settings", update);
    return () => window.removeEventListener("nexora-settings", update);
  }, [queryClient]);
  const source =
    companyQuery.isError || details.isError
      ? "mock"
      : companyQuery.isPending || details.isPending
        ? "loading"
        : "api";
  return {
    source,
    // Company lookup remains independent of profile/preferences failures.
    company: !companyQuery.isError && company ? company : companies[0]!,
    companySource: companyQuery.isError ? "mock" : company ? "api" : "loading",
    settings: source === "api" ? details.data!.settings : (local.data ?? defaultSettings),
    identity: source === "api" ? details.data! : null,
    error: companyQuery.error ?? details.error ?? local.error,
    isFetching: companyQuery.isFetching || details.isFetching,
    retry: () => {
      void companyQuery
        .refetch()
        .then(() => queryClient.invalidateQueries({ queryKey: ["identity", "details"] }));
    },
  } as const;
}
