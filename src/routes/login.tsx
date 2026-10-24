import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { post } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/login")({ component: Login });
function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await post("/auth/login", { email: data.get("email"), password: data.get("password") });
      await client.cancelQueries();
      client.clear();
      await navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="surface-canvas grid min-h-screen place-items-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-lg"
      >
        <p className="text-sm font-semibold text-primary">NEXORA</p>
        <h1 className="text-2xl font-semibold">Entre na sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Use o acesso fornecido pelo administrador da sua empresa.
        </p>
        <label className="block">
          E-mail
          <input
            className="mt-2 w-full rounded-lg border p-3"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </label>
        <label className="block">
          Senha
          <input
            className="mt-2 w-full rounded-lg border p-3"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Para obter ou recuperar seu acesso, procure o administrador.
        </p>
        <Link to="/apresentacao" className="block text-sm text-primary">
          Conheça a Nexora
        </Link>
      </form>
    </main>
  );
}
