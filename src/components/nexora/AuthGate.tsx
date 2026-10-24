import { useSession } from "@/hooks/use-session";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { ApiError, post } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
export function LogoutButton() {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await post("/auth/logout", {});
            await client.cancelQueries();
            client.clear();
            window.location.assign("/login");
          } catch {
            setError("Não foi possível sair. Tente novamente.");
            setBusy(false);
          }
        }}
      >
        Sair da conta
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
function Protected({ children }: { children: ReactNode }) {
  const session = useSession();
  const client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      void client.cancelQueries().then(() => {
        client.clear();
        window.location.assign("/login");
      });
    };
    window.addEventListener("nexora-session-expired", expired);
    return () => window.removeEventListener("nexora-session-expired", expired);
  }, [client]);
  if (session.isPending)
    return (
      <p role="status" className="p-8">
        Verificando acesso…
      </p>
    );
  if (session.error)
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">
          {session.error instanceof ApiError && session.error.status === 401
            ? "Entre para continuar"
            : "Não foi possível verificar o acesso"}
        </h1>
        <p className="my-4">{session.error.message}</p>
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
        <Button variant="outline" onClick={() => void session.refetch()}>
          Tentar novamente
        </Button>
      </main>
    );
  return children;
}
export function AuthGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return ["/login", "/apresentacao"].includes(path) ? children : <Protected>{children}</Protected>;
}
