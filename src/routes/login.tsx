import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currency } from "@/lib/mock-data";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — NEXORA" },
      {
        name: "description",
        content: "Acesse a Nexora e veja o impacto das suas decisões antes de tomá-las.",
      },
      { property: "og:title", content: "Entrar — NEXORA" },
      {
        property: "og:description",
        content: "Plataforma de inteligência operacional para pequenas e médias empresas.",
      },
    ],
  }),
  component: LoginPage,
});

function PreviewComposition() {
  return (
    <div className="relative hidden h-full overflow-hidden rounded-3xl bg-sidebar p-10 lg:block">
      <div className="absolute -left-20 -top-20 size-72 rounded-full bg-[image:var(--gradient-brand)] opacity-30 blur-3xl" />
      <div className="absolute bottom-0 right-0 size-80 rounded-full bg-insight/25 blur-3xl" />

      <div className="relative flex h-full flex-col justify-center gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Inteligência operacional
          </p>
          <h2 className="mt-2 max-w-sm font-display text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Veja o impacto das suas decisões antes de tomá-las.
          </h2>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/60 p-5 backdrop-blur">
            <p className="text-xs text-sidebar-foreground/60">Saúde operacional prevista</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-display text-4xl font-semibold text-sidebar-accent-foreground">
                84
              </span>
              <span className="pb-1 text-xs text-success">+4 pontos</span>
            </div>
            <div className="mt-4 flex h-16 items-end gap-1.5">
              {[58, 64, 61, 72, 78, 74, 84].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="flex-1 rounded-t-md bg-[image:var(--gradient-brand)] opacity-80"
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-danger/30 bg-danger/12 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="size-4" />
              <p className="text-sm font-semibold">Ruptura de estoque em 3 dias</p>
            </div>
            <p className="mt-1 text-xs text-sidebar-foreground/65">
              Probabilidade 91% · Impacto {currency(8420)}
            </p>
          </div>

          <div className="ml-8 rounded-2xl border border-success/30 bg-success/12 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="size-4" />
              <p className="text-sm font-semibold">Oportunidade: horário ocioso</p>
            </div>
            <p className="mt-1 text-xs text-sidebar-foreground/65">
              +34 clientes/mês · +{currency(3280)} de receita
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/" }), 900);
  }

  return (
    <div className="surface-canvas min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-2 md:px-10">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-[image:var(--gradient-brand)]">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">NEXORA</span>
          </div>

          <h1 className="mt-10 text-3xl font-semibold">Entrar na Nexora</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe riscos, oportunidades e simulações da sua operação.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                defaultValue="bruno@bellastudio.com.br"
                placeholder="voce@empresa.com.br"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                defaultValue="nexora2026"
                placeholder="••••••••"
                className="h-11"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Analisando sua operação..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Novo na Nexora?{" "}
            <Link to="/" className="font-semibold text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </div>

        <PreviewComposition />
      </div>
    </div>
  );
}
