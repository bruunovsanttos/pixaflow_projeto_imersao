import type { KpiCard, Risk, Opportunity, TimelineEvent } from "./mock-data";

const money = (amount: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);

/** Undefined means unavailable; an empty successful response is a real zero. */
export function dashboardKpis(
  demo: KpiCard[],
  risks: Risk[] | undefined,
  opportunities: Opportunity[] | undefined,
): KpiCard[] {
  return demo.map((card) => {
    if (card.id === "risks")
      return {
        ...card,
        trend: "flat",
        tone: risks?.some((risk) => risk.severity === "critico") ? "danger" : "primary",
        value: risks
          ? `${risks.filter((risk) => risk.severity === "critico").length} críticos`
          : "—",
        hint: risks
          ? `${risks.length} riscos · Impacto exposto ${money(risks.reduce((sum, risk) => sum + risk.impact, 0))}`
          : "Aguardando dados da API; consulte o status de Riscos abaixo.",
      };
    if (card.id === "opps")
      return {
        ...card,
        trend: "flat",
        value: opportunities ? `${opportunities.length} oportunidades` : "—",
        hint: opportunities
          ? "Registros da API · todos os horizontes"
          : "Aguardando dados da API; consulte o status de Oportunidades abaixo.",
      };
    return {
      ...card,
      label: `${card.label} · Demonstrativo`,
      hint: `${card.hint} · Sem fonte na API`,
    };
  });
}

/** Compare calendar dates without parsing them as UTC instants. */
export function upcomingEvents(events: TimelineEvent[], today = new Date()): TimelineEvent[] {
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return events
    .filter((event) => event.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(0, 4);
}
