import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { AppShell } from "@/components/nexora/AppShell";
import { PageHeader, Pill, toneStyles, type Tone } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askCompany, realAssistantSuggestions, type SourcedAnswer } from "@/lib/api/assistant";
import { useIdentity } from "@/hooks/use-identity";
import { profileInitials } from "@/lib/api/identity";
import { DashboardDataStatus } from "@/components/nexora/DashboardDataStatus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente Nexora — NEXORA" },
      {
        name: "description",
        content: "Pergunte sobre riscos, receita e capacidade e receba respostas com indicadores.",
      },
      { property: "og:title", content: "Assistente Nexora — NEXORA" },
      {
        property: "og:description",
        content: "Converse com a Nexora sobre a sua operação e receba análises visuais.",
      },
    ],
  }),
  component: AssistantPage,
});

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  answer?: SourcedAnswer;
}

function AnswerBlock({ answer }: { answer: SourcedAnswer }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{answer.text}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {answer.cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{card.title}</p>
            <p className="mt-1 font-display text-xl font-semibold">{card.value}</p>
            <span
              className={cn(
                "mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                toneStyles[card.tone as Tone],
              )}
            >
              {card.hint}
            </span>
          </div>
        ))}
      </div>
      <ul className="space-y-2">
        {answer.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {answer.sources.map((source) => (
          <Link key={source.to} to={source.to} className="underline">
            Fonte: {source.label}
          </Link>
        ))}
        <span>Consultado em {new Date(answer.consultedAt).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

function AssistantPage() {
  const identity = useIdentity();
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function ask(question: string, retry = false) {
    const text = question.trim();
    if (!text || inFlight.current || identity.companySource !== "api") return;
    inFlight.current = true;
    setInput("");
    setError("");
    setLastQuestion(text);
    if (!retry) setMessages((prev) => [...prev, { id: Date.now(), role: "user", text }]);
    setThinking(true);
    try {
      const answer = await askCompany(identity.company.id, text);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: "", answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar os dados.");
    } finally {
      setThinking(false);
      inFlight.current = false;
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <PageHeader
          eyebrow="Assistente"
          title="Assistente Nexora"
          description="Consulte riscos, oportunidades e eventos reais da empresa. Respostas por assunto, sem IA generativa."
        />

        {identity.companySource !== "api" && (
          <DashboardDataStatus
            label="Empresa"
            resource={{
              source: identity.companySource,
              isFetching: identity.isFetching,
              retry: identity.retry,
            }}
          />
        )}
        {error && (
          <div role="alert" className="mb-4 rounded-xl border p-4">
            <p>{error}</p>
            <Button
              variant="outline"
              disabled={thinking}
              onClick={() => void ask(lastQuestion, true)}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        <div className="flex min-h-[460px] flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
            {messages.length === 0 && !thinking ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-[image:var(--gradient-brand)]">
                  <Sparkles className="size-6 text-primary-foreground" />
                </div>
                <p className="mt-4 text-base font-semibold">
                  Como posso ajudar
                  {identity.source === "api" ? `, ${identity.settings.name.split(" ")[0]}` : ""}?
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Consulte os riscos, oportunidades ou próximos eventos cadastrados na sua empresa.
                </p>
              </div>
            ) : null}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end gap-3">
                  <div className="max-w-[80%] break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {m.text}
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-semibold">
                    {identity.source === "api" ? profileInitials(identity.settings.name) : "?"}
                  </span>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-brand)]">
                    <Sparkles className="size-4 text-primary-foreground" />
                  </span>
                  <div className="min-w-0 w-full rounded-2xl rounded-bl-sm bg-muted/60 p-4">
                    {m.answer ? <AnswerBlock answer={m.answer} /> : m.text}
                  </div>
                </div>
              ),
            )}

            {thinking ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-brand)]">
                  <Sparkles className="size-4 text-primary-foreground" />
                </span>
                <Loader2 className="size-4 animate-spin" />
                Consultando os dados da empresa...
              </div>
            ) : null}
          </div>

          <div className="border-t border-border p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {realAssistantSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => void ask(s)}
                  disabled={thinking || identity.companySource !== "api"}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Pergunta ao assistente"
                maxLength={2000}
                placeholder="Pergunte algo sobre a sua operação..."
                className="h-11"
              />
              <Button
                type="submit"
                size="lg"
                disabled={thinking || !input.trim() || identity.companySource !== "api"}
              >
                <Send className="size-4" />
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Pill tone="primary">Consulta aos registros da empresa · Sem previsões inventadas</Pill>
        </div>
      </div>
    </AppShell>
  );
}
