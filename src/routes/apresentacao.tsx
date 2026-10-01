import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Pill } from "@/components/nexora/primitives";
import { currency, risks, opportunities, operationalHealth } from "@/lib/mock-data";

export const Route = createFileRoute("/apresentacao")({
  head: () => ({
    meta: [
      { title: "NEXORA — Veja o impacto antes de decidir" },
      {
        name: "description",
        content:
          "Antecipe riscos, descubra oportunidades e teste decisões em uma demonstração de inteligência operacional.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="surface-canvas min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-6 md:px-10">
        <Link
          to="/apresentacao"
          className="flex items-center gap-2 font-display text-xl font-semibold"
        >
          <Sparkles className="text-primary" />
          NEXORA
        </Link>
        <Button asChild variant="outline">
          <Link to="/login">Entrar na demonstração</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-7xl px-5 pb-16 md:px-10">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <Pill tone="primary">Inteligência operacional para pequenas empresas</Pill>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Veja o impacto das suas decisões{" "}
              <span className="text-primary">antes de tomá-las.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              O estoque vai acabar? A equipe suporta mais demanda? Explore o futuro da sua operação
              e compare caminhos antes de agir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/">
                  Explorar a Nexora <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/simulador" search={{ q: "Aumentar marketing em 30%" }}>
                  Testar uma decisão
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Demonstração gratuita, sem cadastro. Empresa e previsões fictícias.
            </p>
          </div>
          <div className="rounded-3xl bg-sidebar p-5 text-sidebar-accent-foreground shadow-xl md:p-8">
            <p className="text-xs uppercase tracking-widest text-sidebar-foreground">
              Bella Studio · Um futuro possível
            </p>
            <div className="my-6 flex items-end gap-3">
              <strong className="font-display text-6xl">{operationalHealth.score}</strong>
              <span className="pb-2 text-sidebar-foreground">/ 100 de saúde operacional</span>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4">
                <p className="font-semibold">Em 3 dias · {risks[0]!.title}</p>
                <p className="mt-1 text-sm text-sidebar-foreground">
                  {risks[0]!.probability}% de probabilidade · {currency(risks[0]!.impact)} em risco
                </p>
              </div>
              <div className="rounded-2xl border border-success/40 bg-success/10 p-4">
                <p className="font-semibold">Uma oportunidade para agir</p>
                <p className="mt-1 text-sm text-sidebar-foreground">
                  {opportunities[0]!.title} · +{currency(opportunities[0]!.potentialRevenue)} em{" "}
                  {opportunities[0]!.horizon}
                </p>
              </div>
              <Button asChild className="mt-2 w-full">
                <Link to="/simulador" search={{ q: "Repor estoque" }}>
                  E se eu repuser o estoque? <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section aria-labelledby="how">
          <h2 id="how" className="mb-6 text-2xl font-semibold">
            Do sinal à decisão, em três passos.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Panel title="01 · Antecipe">
              <ShieldAlert className="mb-4 text-danger" />
              <p className="text-sm text-muted-foreground">
                Veja causas, prazos e impactos dos riscos que merecem atenção.
              </p>
              <Link to="/riscos" className="mt-4 inline-block text-sm font-semibold text-primary">
                Explorar riscos →
              </Link>
            </Panel>
            <Panel title="02 · Enxergue o futuro">
              <Compass className="mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Conecte os eventos de estoque, equipe e caixa em uma linha do tempo.
              </p>
              <Link
                to="/linha-do-tempo"
                className="mt-4 inline-block text-sm font-semibold text-primary"
              >
                Ver a linha do tempo →
              </Link>
            </Panel>
            <Panel title="03 · Experimente">
              <Sparkles className="mb-4 text-insight" />
              <p className="text-sm text-muted-foreground">
                Altere premissas, observe consequências e compare cenários salvos.
              </p>
              <Link
                to="/simulador"
                search={{}}
                className="mt-4 inline-block text-sm font-semibold text-primary"
              >
                Simular uma decisão →
              </Link>
            </Panel>
          </div>
        </section>
        <section className="mt-12 rounded-2xl border bg-card p-6 md:p-8">
          <h2 className="text-xl font-semibold">Um primeiro olhar sobre a operação.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Este MVP demonstra uma empresa de beleza e estética com estoque, agenda, equipe e fluxo
            de caixa. As simulações usam regras ilustrativas. Conexão com dados reais, autenticação
            e previsões validadas fazem parte da próxima etapa.
          </p>
        </section>
      </main>
      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        NEXORA · Veja possibilidades. Tome decisões com contexto.
      </footer>
    </div>
  );
}
