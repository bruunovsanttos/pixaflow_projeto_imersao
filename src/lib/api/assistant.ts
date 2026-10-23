import { getRisks } from "./risks";
import { getOpportunities } from "./opportunities";
import { getTimelineEvents } from "./timeline";
import {
  loadCompanyData,
  riskListSchema,
  opportunityListSchema,
  timelineListSchema,
  opportunityLabels,
  formatTimelineDate,
} from "./company-data";
import type { AssistantAnswer, Risk, Opportunity, TimelineEvent } from "../mock-data";
export const realAssistantSuggestions = [
  "Quais riscos exigem atenção?",
  "Quais oportunidades estão cadastradas?",
  "Quais são os próximos eventos?",
  "Resumo da empresa",
];
export type SourcedAnswer = AssistantAnswer & {
  sources: { label: string; to: "/riscos" | "/oportunidades" | "/linha-do-tempo" }[];
  consultedAt: string;
};
const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export interface AssistantData {
  risks?: Risk[] | undefined;
  opportunities?: Opportunity[] | undefined;
  events?: TimelineEvent[] | undefined;
}
/** Fixed, transparent topic lookup. No model, invented numbers, or instructions executed from records. */
export function answerFromData(
  question: string,
  data: AssistantData,
  now = new Date(),
): SourcedAnswer {
  const q = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const answer: SourcedAnswer = {
    text: "",
    cards: [],
    bullets: [],
    sources: [],
    consultedAt: now.toISOString(),
  };
  const summary = /resumo|visao geral/.test(q);
  const riskTopic = summary || /risco|estoque|perd|dinheiro|caixa|capacidade|atencao/.test(q);
  const opportunityTopic = summary || /oportunidade|ganho|economia/.test(q);
  const eventTopic = summary || /evento|agenda|linha do tempo/.test(q);
  const unsupported = !riskTopic && !opportunityTopic && !eventTopic;
  answer.text = unsupported
    ? "Não tenho dados suficientes para responder a essa pergunta. Posso consultar riscos, oportunidades e eventos cadastrados. Receita prevista, saúde operacional, eficiência e efeitos de decisões ainda não têm cálculo real disponível."
    : "Consulta aos registros da empresa. Valores são os cadastrados, não uma nova previsão ou confirmação de resultados realizados.";
  if (riskTopic) {
    if (!data.risks)
      answer.bullets.push(
        "Riscos indisponíveis: não foi possível consultar essa fonte. Tente a pergunta novamente.",
      );
    else {
      const critical = data.risks.filter((r) => r.severity === "critico");
      answer.cards.push(
        {
          title: "Riscos críticos",
          value: String(critical.length),
          hint: `${data.risks.length} riscos cadastrados`,
          tone: "danger",
        },
        {
          title: "Impacto exposto",
          value: currency(data.risks.reduce((sum, r) => sum + r.impact, 0)),
          hint: "Soma dos riscos; não é perda realizada",
          tone: "warning",
        },
      );
      answer.sources.push({ label: "Riscos", to: "/riscos" });
      const ordered = [...data.risks].sort(
        (a, b) =>
          Number(b.severity === "critico") - Number(a.severity === "critico") ||
          b.impact - a.impact,
      );
      answer.bullets.push(
        ...ordered
          .slice(0, 3)
          .map(
            (r) =>
              `${r.title}: impacto ${currency(r.impact)}, probabilidade cadastrada ${r.probability}%. Prazo informado: ${r.deadline}. ${r.recommendations[0] ? `Recomendação cadastrada: ${r.recommendations[0]}` : "Sem recomendação cadastrada."}`,
          ),
      );
      if (!ordered.length) answer.bullets.push("Nenhum risco cadastrado.");
      if (/perd|dinheiro|caixa/.test(q))
        answer.bullets.push(
          "Os registros de risco não comprovam perdas, lucro ou saldo de caixa realizado.",
        );
      if (/capacidade|contrat/.test(q))
        answer.bullets.push(
          "Não há medição atual de capacidade ou cálculo real do efeito de contratar disponível.",
        );
    }
  }
  if (opportunityTopic) {
    if (!data.opportunities)
      answer.bullets.push(
        "Oportunidades indisponíveis: não foi possível consultar essa fonte. Tente a pergunta novamente.",
      );
    else {
      answer.cards.push({
        title: "Oportunidades",
        value: String(data.opportunities.length),
        hint: "Todos os horizontes cadastrados",
        tone: "insight",
      });
      answer.sources.push({ label: "Oportunidades", to: "/oportunidades" });
      answer.bullets.push(
        ...data.opportunities.slice(0, 4).map((o) => {
          const labels = opportunityLabels(o);
          return `${o.title}: ${labels.benefit.toLowerCase()} potencial ${currency(o.potentialRevenue)}, custo ${currency(o.cost)}, ROI ${labels.roi}, horizonte ${o.horizon}. Ação cadastrada: ${o.action}`;
        }),
      );
      if (!data.opportunities.length) answer.bullets.push("Nenhuma oportunidade cadastrada.");
      answer.bullets.push(
        "Potenciais podem se sobrepor e ter horizontes diferentes; não foram somados como receita prevista.",
      );
    }
  }
  if (eventTopic) {
    if (!data.events)
      answer.bullets.push(
        "Eventos indisponíveis: não foi possível consultar essa fonte. Tente a pergunta novamente.",
      );
    else {
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const upcoming = data.events
        .filter((e) => e.date >= date)
        .sort((a, b) => a.date.localeCompare(b.date));
      answer.cards.push({
        title: "Eventos futuros",
        value: String(upcoming.length),
        hint: "A partir de hoje",
        tone: "primary",
      });
      answer.sources.push({ label: "Linha do Tempo", to: "/linha-do-tempo" });
      answer.bullets.push(
        ...upcoming
          .slice(0, 4)
          .map((e) => `${formatTimelineDate(e.date)} — ${e.title}: ${e.description}`),
      );
      if (!upcoming.length)
        answer.bullets.push(
          "Nenhum evento futuro cadastrado. Eventos passados continuam disponíveis na Linha do Tempo.",
        );
    }
  }
  return answer;
}
export async function askCompany(companyId: string, question: string): Promise<SourcedAnswer> {
  const [risks, opportunities, events] = await Promise.allSettled([
    loadCompanyData(companyId, getRisks, riskListSchema),
    loadCompanyData(companyId, getOpportunities, opportunityListSchema),
    loadCompanyData(companyId, getTimelineEvents, timelineListSchema),
  ]);
  if ([risks, opportunities, events].every((item) => item.status === "rejected"))
    throw new Error("Não foi possível consultar os dados da empresa. Tente novamente.");
  return answerFromData(question, {
    risks: risks.status === "fulfilled" ? risks.value : undefined,
    opportunities: opportunities.status === "fulfilled" ? opportunities.value : undefined,
    events: events.status === "fulfilled" ? events.value : undefined,
  });
}
