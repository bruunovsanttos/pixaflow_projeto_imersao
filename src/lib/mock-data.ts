import { z } from "zod";
import { readDemo, writeDemo } from "./demo-storage";

/**
 * Camada de dados mockados da Nexora.
 *
 * Cada função abaixo representa um endpoint futuro da API Python/FastAPI.
 * Para integrar o backend real, basta trocar o corpo das funções por chamadas
 * HTTP mantendo os mesmos tipos exportados.
 */

export type Severity = "normal" | "atencao" | "critico";
export type RiskCategory = "Financeiro" | "Estoque" | "Operação" | "Pessoas";

export interface Company {
  id: string;
  name: string;
  segment: string;
}

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  hint: string;
  trend: "up" | "down" | "flat";
  tone: "primary" | "success" | "warning" | "danger" | "insight";
}

export interface HealthPoint {
  day: string;
  score: number;
  baseline: number;
}

export interface Forecast {
  label: string;
  score: number;
  severity: Severity;
}

export interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  description: string;
  detail: string;
  probability: number;
  impact: number;
  deadline: string;
  status: "Ativo" | "Em análise" | "Monitorando";
  severity: Severity;
  cause: string;
  recommendations: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  action: string;
  potentialRevenue: number;
  cost: number;
  roi: number | null;
  extraClients: number;
  effort: "Baixo" | "Médio" | "Alto";
  horizon: string;
  confidence: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  severity: Severity;
  description: string;
  cause: string;
  impact: string;
  recommendations: string[];
}

export interface ScenarioMetrics {
  investment: number;
  clients: number;
  revenue: number;
  capacity: number;
}

export const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export const companies: Company[] = [
  { id: "bellastudio", name: "Bella Studio", segment: "Beleza & Estética" },
];

export const currentUser = {
  name: "Bruno Vieira",
  role: "Diretor de Operações",
  initials: "BV",
  email: "bruno@bellastudio.com.br",
};

export const operationalHealth = {
  score: 86,
  delta: 4,
  label: "Saúde Operacional",
};

export const kpis: KpiCard[] = [
  {
    id: "revenue",
    label: "Receita prevista",
    value: currency(31870),
    hint: "próximos 30 dias",
    trend: "up",
    tone: "primary",
  },
  {
    id: "risks",
    label: "Riscos identificados",
    value: "3 críticos",
    hint: "2 exigem ação em 72h",
    trend: "down",
    tone: "danger",
  },
  {
    id: "opps",
    label: "Oportunidades",
    value: "5 oportunidades",
    hint: "Potenciais em horizontes de 15 a 90 dias",
    trend: "up",
    tone: "insight",
  },
  {
    id: "efficiency",
    label: "Eficiência operacional",
    value: "87%",
    hint: "+2 p.p. na semana",
    trend: "up",
    tone: "success",
  },
];

export const healthTrend: HealthPoint[] = [
  { day: "Hoje", score: 86, baseline: 82 },
  { day: "Ter", score: 84, baseline: 82 },
  { day: "Qua", score: 82, baseline: 82 },
  { day: "Qui", score: 77, baseline: 82 },
  { day: "Sex", score: 74, baseline: 82 },
  { day: "Sáb", score: 72, baseline: 82 },
  { day: "Dom", score: 71, baseline: 82 },
];

export const forecasts: Forecast[] = [
  { label: "Hoje", score: 86, severity: "normal" },
  { label: "Amanhã", score: 84, severity: "normal" },
  { label: "3 dias", score: 77, severity: "atencao" },
  { label: "7 dias", score: 71, severity: "critico" },
];

export const risks: Risk[] = [
  {
    id: "estoque-shampoo",
    title: "Ruptura de estoque",
    category: "Estoque",
    description: "Produto: Shampoo Professional 500ml",
    detail:
      "O consumo semanal subiu 22% e o fornecedor tem lead time de 6 dias. O saldo atual cobre apenas 3 dias de demanda.",
    probability: 91,
    impact: 8420,
    deadline: "3 dias",
    status: "Ativo",
    severity: "critico",
    cause: "Aumento de demanda combinado a pedido de reposição não emitido na janela ideal.",
    recommendations: [
      "Emitir pedido de compra hoje com 40 unidades",
      "Ativar fornecedor alternativo para entrega em 48h",
      "Limitar promoções do item até a reposição",
    ],
  },
  {
    id: "capacidade",
    title: "Capacidade operacional excedida",
    category: "Operação",
    description: "Capacidade projetada: 106%",
    detail:
      "A agenda de sexta-feira já opera acima do limite saudável, o que tende a gerar atrasos em cadeia.",
    probability: 78,
    impact: 4300,
    deadline: "sexta-feira",
    status: "Em análise",
    severity: "critico",
    cause: "Concentração de agendamentos no turno da tarde sem equipe de apoio escalada.",
    recommendations: [
      "Redistribuir 6 atendimentos para quinta-feira",
      "Escalar 1 profissional extra no turno da tarde",
      "Bloquear encaixes acima de 95% de ocupação",
    ],
  },
  {
    id: "fluxo-caixa",
    title: "Pressão no fluxo de caixa",
    category: "Financeiro",
    description: "Projeção: -12%",
    detail: "Concentração de pagamentos a fornecedores na mesma semana em que os recebíveis caem.",
    probability: 64,
    impact: 6100,
    deadline: "próxima semana",
    status: "Monitorando",
    severity: "critico",
    cause: "Três boletos relevantes vencem antes da entrada dos recebíveis de cartão.",
    recommendations: [
      "Negociar prorrogação de 10 dias com 2 fornecedores",
      "Antecipar 30% dos recebíveis de cartão",
      "Adiar compra não essencial de R$ 1.200",
    ],
  },
  {
    id: "turnover",
    title: "Risco de sobrecarga da equipe",
    category: "Pessoas",
    description: "Horas extras acima da média em 3 semanas seguidas",
    detail: "Dois profissionais acumulam 14h extras no mês, indicador antecedente de turnover.",
    probability: 47,
    impact: 2600,
    deadline: "30 dias",
    status: "Monitorando",
    severity: "atencao",
    cause: "Escala desequilibrada após saída de um colaborador em agosto.",
    recommendations: ["Revisar escala da equipe", "Abrir processo seletivo de apoio"],
  },
  {
    id: "inadimplencia",
    title: "Aumento de inadimplência em pacotes",
    category: "Financeiro",
    description: "Parcelas em atraso: 8",
    detail: "A taxa de atraso subiu de 3,1% para 5,4% nos últimos 60 dias.",
    probability: 39,
    impact: 1840,
    deadline: "45 dias",
    status: "Monitorando",
    severity: "atencao",
    cause: "Pacotes vendidos sem verificação de histórico de pagamento.",
    recommendations: ["Ativar lembrete automático em D-3", "Exigir entrada de 20% em pacotes"],
  },
  {
    id: "fornecedor",
    title: "Dependência de fornecedor único",
    category: "Estoque",
    description: "62% das compras concentradas",
    detail: "Um único fornecedor responde por mais da metade do volume de insumos.",
    probability: 28,
    impact: 3200,
    deadline: "90 dias",
    status: "Monitorando",
    severity: "normal",
    cause: "Ausência de cadastro homologado de fornecedores alternativos.",
    recommendations: ["Homologar 2 fornecedores adicionais", "Definir teto de 40% por fornecedor"],
  },
];

export const opportunities: Opportunity[] = [
  {
    id: "capacidade-ociosa",
    title: "Capacidade ociosa detectada",
    description:
      "Terças-feiras entre 14h e 17h possuem 42% de capacidade disponível de forma recorrente.",
    action: "Criar uma campanha promocional para o horário ocioso.",
    potentialRevenue: 3280,
    cost: 640,
    roi: 412,
    extraClients: 34,
    effort: "Baixo",
    horizon: "30 dias",
    confidence: 88,
  },
  {
    id: "recompra",
    title: "Janela de recompra sendo perdida",
    description:
      "128 clientes passaram do intervalo médio de retorno de 42 dias sem novo agendamento.",
    action: "Disparar régua de reativação com oferta de retorno.",
    potentialRevenue: 4120,
    cost: 380,
    roi: 984,
    extraClients: 47,
    effort: "Baixo",
    horizon: "21 dias",
    confidence: 81,
  },
  {
    id: "mix-servicos",
    title: "Mix de serviços com margem superior",
    description: "Serviços combinados têm margem 19 p.p. maior e representam só 12% das vendas.",
    action: "Treinar a equipe para oferta combinada no atendimento.",
    potentialRevenue: 2760,
    cost: 900,
    roi: 207,
    extraClients: 18,
    effort: "Médio",
    horizon: "60 dias",
    confidence: 73,
  },
  {
    id: "compra-volume",
    title: "Negociação de compra por volume",
    description: "O volume dos 3 principais insumos já atinge a faixa de desconto do fornecedor.",
    action: "Renegociar tabela e consolidar pedidos mensais.",
    potentialRevenue: 1480,
    cost: 0,
    roi: null,
    extraClients: 0,
    effort: "Baixo",
    horizon: "15 dias",
    confidence: 91,
  },
  {
    id: "pacote-assinatura",
    title: "Potencial para plano de assinatura",
    description: "26% dos clientes retornam mensalmente e aceitariam previsibilidade de preço.",
    action: "Lançar plano mensal com 2 serviços inclusos.",
    potentialRevenue: 5400,
    cost: 1200,
    roi: 350,
    extraClients: 40,
    effort: "Alto",
    horizon: "90 dias",
    confidence: 66,
  },
];

export const timeline: TimelineEvent[] = [
  {
    id: "t0",
    date: "Hoje",
    title: "Operação normal",
    severity: "normal",
    description: "Indicadores dentro da faixa esperada, com saúde operacional em 86 pontos.",
    cause: "Demanda estável e equipe completa.",
    impact: "Nenhum impacto financeiro previsto.",
    recommendations: ["Manter monitoramento diário"],
  },
  {
    id: "t1",
    date: "01 OUT",
    title: "Estoque do Shampoo Professional abaixo do ideal",
    severity: "atencao",
    description: "O saldo cruza o ponto de reposição definido para o item.",
    cause: "Consumo 22% acima da média das últimas 4 semanas.",
    impact: "Risco de indisponibilidade em atendimentos de alto ticket.",
    recommendations: ["Emitir pedido de reposição", "Revisar ponto de pedido do item"],
  },
  {
    id: "t2",
    date: "03 OUT",
    title: "Possível ruptura de estoque",
    severity: "critico",
    description: "Probabilidade de 91% de zerar o item antes da entrega do fornecedor.",
    cause: "Lead time de 6 dias maior que a cobertura atual de 3 dias.",
    impact: "Perda estimada de R$ 8.420 em vendas.",
    recommendations: ["Acionar fornecedor alternativo", "Substituir item em promoções"],
  },
  {
    id: "t3",
    date: "05 OUT",
    title: "Funcionário entra de férias",
    severity: "atencao",
    description: "Redução de 1 posto no turno da tarde por 15 dias.",
    cause: "Férias programadas sem cobertura definida.",
    impact: "Queda de 11% na capacidade de atendimento.",
    recommendations: ["Definir cobertura de escala", "Limitar encaixes no período"],
  },
  {
    id: "t4",
    date: "07 OUT",
    title: "Capacidade operacional projetada em 106%",
    severity: "critico",
    description: "A demanda projetada supera a capacidade instalada da semana.",
    cause: "Agenda concentrada somada à ausência por férias.",
    impact: "Atrasos em cadeia e queda de satisfação.",
    recommendations: ["Escalar apoio temporário", "Redistribuir agendamentos"],
  },
  {
    id: "t5",
    date: "10 OUT",
    title: "Caixa abaixo da média",
    severity: "atencao",
    description: "Saldo projetado 12% abaixo da média dos últimos 6 meses.",
    cause: "Concentração de pagamentos a fornecedores.",
    impact: "Menor folga para compras oportunistas.",
    recommendations: ["Renegociar vencimentos", "Antecipar parte dos recebíveis"],
  },
  {
    id: "t6",
    date: "15 OUT",
    title: "Normalização prevista",
    severity: "normal",
    description: "Indicadores retornam à faixa saudável com saúde operacional em 85 pontos.",
    cause: "Reposição de estoque e retorno da equipe completa.",
    impact: "Retomada da capacidade total.",
    recommendations: ["Consolidar aprendizados do ciclo"],
  },
];

export const baseScenario: ScenarioMetrics = {
  investment: 4000,
  clients: 218,
  revenue: 37000,
  capacity: 82,
};

export const simulatedScenario: ScenarioMetrics = {
  investment: 5200,
  clients: 279,
  revenue: 45600,
  capacity: 106,
};

export const simulationImpacts = [
  { label: "Receita", value: "+23%", tone: "success" as const },
  { label: "Demanda", value: "+28%", tone: "success" as const },
  { label: "Custo", value: "+18%", tone: "warning" as const },
  { label: "Capacidade", value: "82% → 106%", tone: "danger" as const },
];

export const simulationSuggestions = [
  "Aumentar estoque",
  "Contratar funcionário",
  "Aumentar marketing",
  "Reduzir preço",
  "Abrir nova unidade",
];

export const scenarioSeries = [
  { month: "Out", atual: 37000, simulado: 45600, ajustado: 41200 },
  { month: "Nov", atual: 37600, simulado: 46900, ajustado: 42400 },
  { month: "Dez", atual: 39100, simulado: 48800, ajustado: 44300 },
  { month: "Jan", atual: 36200, simulado: 44100, ajustado: 40800 },
];

export const assistantSuggestions = [
  "O que devo acompanhar essa semana?",
  "Qual meu maior risco operacional?",
  "O que acontece se eu contratar mais uma pessoa?",
  "Onde estou perdendo dinheiro?",
];

export interface AssistantCard {
  title: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "danger" | "insight";
}

export interface AssistantAnswer {
  text: string;
  cards: AssistantCard[];
  bullets: string[];
}

export const assistantAnswers: Record<string, AssistantAnswer> = {
  "O que devo acompanhar essa semana?": {
    text: "Estes são os três riscos críticos da empresa demonstrada.",
    cards: [
      {
        title: "Saúde operacional",
        value: "86 → 71",
        hint: "queda prevista em 7 dias",
        tone: "warning",
      },
      {
        title: "Impacto em risco",
        value: currency(18820),
        hint: "soma dos 3 riscos críticos",
        tone: "danger",
      },
      {
        title: "Ganho disponível",
        value: currency(7400),
        hint: "ações em 21 e 30 dias; podem se sobrepor",
        tone: "insight",
      },
    ],
    bullets: [
      "Reposição do Shampoo Professional 500ml até quinta-feira",
      "Redistribuir a agenda de sexta para sair de 106% de capacidade",
      "Ativar a régua de recompra para 128 clientes parados",
    ],
  },
  "Qual meu maior risco operacional?": {
    text: "A ruptura de estoque do Shampoo Professional 500ml é o risco de maior probabilidade e impacto combinados.",
    cards: [
      { title: "Probabilidade", value: "91%", hint: "próximos 3 dias", tone: "danger" },
      { title: "Impacto estimado", value: currency(8420), hint: "vendas perdidas", tone: "danger" },
      { title: "Janela de ação", value: "48h", hint: "antes do ponto crítico", tone: "warning" },
    ],
    bullets: [
      "Lead time do fornecedor: 6 dias",
      "Cobertura atual do estoque: 3 dias",
      "Fornecedor alternativo entrega em 48h com custo 7% maior",
    ],
  },
  "O que acontece se eu contratar mais uma pessoa?": {
    text: "A contratação resolve o gargalo de capacidade e libera receita hoje represada pela agenda.",
    cards: [
      { title: "Capacidade", value: "106% → 88%", hint: "volta à faixa saudável", tone: "success" },
      { title: "Custo mensal", value: currency(3200), hint: "encargos incluídos", tone: "warning" },
      { title: "Receita liberada", value: currency(5900), hint: "por mês", tone: "success" },
    ],
    bullets: [
      "Payback estimado em 26 dias",
      "Reduz horas extras acumuladas da equipe atual",
      "Melhora a previsão de saúde operacional de 71 para 83 em 7 dias",
    ],
  },
  "Onde estou perdendo dinheiro?": {
    text: "Três vazamentos somam aproximadamente R$ 6.900 por mês.",
    cards: [
      { title: "Ociosidade", value: currency(3280), hint: "terças, 14h-17h", tone: "insight" },
      {
        title: "Clientes parados",
        value: currency(2140),
        hint: "128 sem retorno",
        tone: "warning",
      },
      {
        title: "Inadimplência",
        value: currency(1480),
        hint: "8 parcelas em atraso",
        tone: "danger",
      },
    ],
    bullets: [
      "A ociosidade é o vazamento mais barato de corrigir",
      "A régua de recompra tem ROI estimado de 984%",
      "Lembretes automáticos reduzem atrasos em cerca de 40%",
    ],
  },
};

export const defaultAssistantAnswer: AssistantAnswer = {
  text: "Esta pergunta ainda não tem uma resposta específica na demonstração. Abaixo está um resumo geral; experimente uma das perguntas sugeridas.",
  cards: [
    { title: "Saúde operacional", value: "86 / 100", hint: "+4 pontos na semana", tone: "primary" },
    { title: "Riscos ativos", value: "3 críticos", hint: "impacto de R$ 18.820", tone: "danger" },
    { title: "Oportunidades", value: "5 abertas", hint: "prazos de 15 a 90 dias", tone: "insight" },
  ],
  bullets: [
    "Priorize o risco de estoque com janela de 48h",
    "A oportunidade de capacidade ociosa tem ROI de 412%",
    "Simule a decisão antes de aplicar para ver o impacto na capacidade",
  ],
};

export const notifications = [
  { title: risks[0]!.title, hint: risks[0]!.description, tone: "danger", to: "/riscos" },
  { title: risks[1]!.title, hint: risks[1]!.description, tone: "warning", to: "/linha-do-tempo" },
  {
    title: opportunities[0]!.title,
    hint: opportunities[0]!.action,
    tone: "insight",
    to: "/oportunidades",
  },
] as const;

export const decisionOptions = [
  {
    id: "marketing",
    label: "Aumentar marketing",
    unit: "%",
    min: 0,
    max: 100,
    initial: 30,
    assumption: "Cada 1% a mais em marketing gera 0,93% de demanda adicional nesta demonstração.",
  },
  {
    id: "stock",
    label: "Repor estoque",
    unit: "unidades",
    min: 0,
    max: 100,
    initial: 40,
    assumption:
      "Cada unidade custa R$ 46. Reposição de 40 unidades recupera até R$ 8.420 em vendas no mês.",
  },
  {
    id: "hire",
    label: "Contratar equipe",
    unit: "pessoas",
    min: 0,
    max: 5,
    initial: 1,
    assumption:
      "Cada pessoa custa R$ 3.200 por mês e amplia a capacidade disponível em 22%. Demanda constante.",
  },
  {
    id: "price",
    label: "Reduzir preço",
    unit: "%",
    min: 0,
    max: 30,
    initial: 10,
    assumption: "Cada 1% de desconto aumenta a demanda em 1,5%. A receita considera o novo preço.",
  },
  {
    id: "unit",
    label: "Abrir nova unidade",
    unit: "unidades",
    min: 0,
    max: 3,
    initial: 1,
    assumption:
      "Cada unidade custa R$ 60 mil na abertura, R$ 12 mil por mês e acrescenta 60% de demanda e 100% de capacidade.",
  },
  {
    id: "opportunity",
    label: "Aplicar oportunidade",
    unit: "% da ação",
    min: 0,
    max: 100,
    initial: 100,
    assumption:
      "Escala proporcional dos custos e ganhos do card selecionado. Hipótese ilustrativa, sem previsão estatística.",
  },
] as const;
export type DecisionKind = (typeof decisionOptions)[number]["id"];
export interface SimulationInput {
  kind: DecisionKind;
  amount: number;
  question: string;
  opportunityId?: string;
}
export interface SimulationResult {
  input: SimulationInput;
  baseline: ScenarioMetrics;
  simulated: ScenarioMetrics;
  additionalCost: number;
  initialCapital: number;
  incrementalBalance: number;
  horizon: string;
  assumption: string;
  recommendations: string[];
}

export function suggestDecision(question: string): DecisionKind {
  const q = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/ocios|campanha|reativ|combinad|renegociar tabela|plano mensal/.test(q)) return "opportunity";
  if (/estoque|shampoo|reposi|fornecedor/.test(q)) return "stock";
  if (/contrat|funcionario|equipe|capacidade|ferias|sobrecarga/.test(q)) return "hire";
  if (/preco|desconto/.test(q)) return "price";
  if (/unidade/.test(q)) return "unit";
  return "marketing";
}

// Pure, deterministic demo rules. The form confirms the variables; text is not interpreted by AI.
export function calculateSimulation(input: SimulationInput): SimulationResult {
  const option = decisionOptions.find((item) => item.id === input.kind);
  if (
    !option ||
    !Number.isFinite(input.amount) ||
    !Number.isInteger(input.amount) ||
    input.amount < option.min ||
    input.amount > option.max
  ) {
    throw new Error("Revise o valor da decisão antes de simular.");
  }
  const opportunity =
    input.kind === "opportunity"
      ? opportunities.find((item) => item.id === input.opportunityId)
      : undefined;
  if (input.kind === "opportunity" && !opportunity)
    throw new Error("Selecione uma oportunidade válida.");
  const period = opportunity ? Number.parseInt(opportunity.horizon, 10) / 30 : 1;
  const baseline = {
    ...baseScenario,
    investment: Math.round(baseScenario.investment * period),
    clients: Math.round(baseScenario.clients * period),
    revenue: Math.round(baseScenario.revenue * period),
  };
  let clients = baseline.clients,
    revenue = baseline.revenue,
    capacity = baseline.capacity;
  let additionalCost = 0,
    initialCapital = 0;
  let horizon = "30 dias";
  const amount = input.amount;
  if (input.kind === "marketing") {
    additionalCost = (baseline.investment * amount) / 100;
    clients *= 1 + amount * 0.0093;
    revenue *= clients / baseline.clients;
    capacity *= clients / baseline.clients;
  } else if (input.kind === "stock") {
    additionalCost = amount * 46;
    revenue += risks[0]!.impact * Math.min(amount / 40, 1);
  } else if (input.kind === "hire") {
    additionalCost = amount * 3200;
    capacity /= 1 + amount * 0.22;
  } else if (input.kind === "price") {
    clients *= 1 + amount * 0.015;
    revenue *= (clients / baseline.clients) * (1 - amount / 100);
    capacity *= clients / baseline.clients;
  } else if (input.kind === "unit") {
    initialCapital = amount * 60000;
    additionalCost = amount * 12000;
    clients *= 1 + amount * 0.6;
    revenue *= clients / baseline.clients;
    capacity *= (1 + amount * 0.6) / (1 + amount);
  } else {
    if (!opportunity) throw new Error("Selecione uma oportunidade válida.");
    const factor = amount / 100;
    additionalCost = opportunity.cost * factor;
    revenue += opportunity.potentialRevenue * factor;
    clients += opportunity.extraClients * factor;
    capacity *= clients / baseline.clients;
    horizon = opportunity.horizon;
  }
  const simulated = {
    investment: Math.round(baseline.investment + additionalCost),
    clients: Math.round(clients),
    revenue: Math.round(revenue),
    capacity: Math.round(capacity),
  };
  return {
    input: { ...input },
    baseline,
    simulated,
    additionalCost: Math.round(additionalCost),
    initialCapital,
    incrementalBalance: Math.round(revenue - baseline.revenue - additionalCost),
    horizon,
    assumption: option.assumption,
    recommendations:
      simulated.capacity > 100
        ? [
            "Redistribuir demanda antes de executar a ação.",
            "Comparar com contratação de equipe para reduzir a ocupação.",
          ]
        : [
            "Validar custos e demanda com os dados reais da empresa.",
            "Acompanhar os resultados antes de ampliar a ação.",
          ],
  };
}

// POST /simulacoes: async boundary ready for a future HTTP adapter.
export async function simulateDecision(input: SimulationInput): Promise<SimulationResult> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return calculateSimulation(input);
}

const inputSchema = z.object({
  kind: z.enum(["marketing", "stock", "hire", "price", "unit", "opportunity"]),
  amount: z.number().finite(),
  question: z.string().max(2000),
  opportunityId: z.string().optional(),
});
const savedSchema = z
  .array(z.object({ id: z.string(), createdAt: z.string(), input: inputSchema }))
  .max(20);
export type SavedScenario = { id: string; createdAt: string; input: SimulationInput };
const scenarioKey = "nexora.scenarios.v1";
export async function listScenarios(): Promise<SavedScenario[]> {
  const items = readDemo(scenarioKey, savedSchema, []);
  return items.map((item) => {
    const input: SimulationInput = {
      kind: item.input.kind,
      amount: item.input.amount,
      question: item.input.question,
    };
    if (item.input.opportunityId) input.opportunityId = item.input.opportunityId;
    calculateSimulation(input);
    return { ...item, input };
  });
}
export async function saveScenario(input: SimulationInput): Promise<SavedScenario[]> {
  calculateSimulation(input);
  const items = await listScenarios();
  if (items.length >= 20) throw new Error("Limite de 20 cenários. Remova um antes de salvar.");
  const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), input }, ...items];
  writeDemo(scenarioKey, next);
  return next;
}
export async function deleteScenario(id: string): Promise<SavedScenario[]> {
  const next = (await listScenarios()).filter((item) => item.id !== id);
  writeDemo(scenarioKey, next);
  return next;
}

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  role: z.string().trim().min(1).max(80),
  alerts: z.object({
    risks: z.boolean(),
    opps: z.boolean(),
    weekly: z.boolean(),
    capacity: z.boolean(),
  }),
  horizon: z.enum(["7", "15", "30"]),
  sensitivity: z.enum(["conservadora", "equilibrada", "agressiva"]),
});
export type DemoSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: DemoSettings = {
  name: currentUser.name,
  email: currentUser.email,
  role: currentUser.role,
  alerts: { risks: true, opps: true, weekly: true, capacity: false },
  horizon: "7",
  sensitivity: "equilibrada",
};
export const alertOptions = [
  { id: "risks", label: "Alertas de risco crítico" },
  { id: "opps", label: "Novas oportunidades" },
  { id: "weekly", label: "Relatório semanal" },
  { id: "capacity", label: "Capacidade acima de 95%" },
] as const;
export async function getSettings(): Promise<DemoSettings> {
  return readDemo("nexora.settings.v1", settingsSchema, defaultSettings);
}
export async function saveSettings(settings: DemoSettings): Promise<DemoSettings> {
  const validated = settingsSchema.parse(settings);
  writeDemo("nexora.settings.v1", validated);
  window.dispatchEvent(new Event("nexora-settings"));
  return validated;
}
