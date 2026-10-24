import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api/client";
export type Session = {
  id: string;
  name: string;
  memberships: { id: string; company_id: string; role: string }[];
};
export function useSession() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return useQuery({
    queryKey: ["session"],
    queryFn: () => get<Session>("/auth/me"),
    enabled: ready,
    retry: false,
    staleTime: 60000,
  });
}
