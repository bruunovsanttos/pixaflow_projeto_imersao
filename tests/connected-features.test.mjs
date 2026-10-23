import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
function compile(name, replacements = {}) {
  const source = fs
    .readFileSync(new URL(`../src/lib/api/${name}.ts`, import.meta.url), "utf8")
    .replaceAll("import.meta.env", JSON.stringify({ VITE_API_URL: "https://api.example/api/v1" }));
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
const client = compile("client"),
  adapters = compile("adapters");
const common = { "./client": client, "./adapters": adapters, zod: import.meta.resolve("zod") };
const scenarios = await import(compile("scenarios", common));
const helper = compile("company-data", common);
const assistant = await import(
  compile("assistant", {
    ...common,
    "./company-data": helper,
    "./risks": compile("risks", common),
    "./opportunities": compile("opportunities", common),
    "./timeline": compile("timeline", common),
  })
);
const company = "11111111-1111-4111-8111-111111111111",
  member = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333",
  bookmark = "44444444-4444-4444-8444-444444444444";
const metric = { investment: "10.25", clients: 3, revenue: "100.50", capacity: "80.25" };
const dto = {
  id,
  company_id: company,
  decision_kind: "marketing",
  amount: 10,
  question: "Teste",
  opportunity_id: null,
  horizon_days: 30,
  model_version: "historical-v1",
  assumption: "Recorded assumption",
  additional_cost: "10.25",
  initial_capital: "0",
  incremental_balance: "-10.25",
  metrics: [
    { ...metric, variant: "simulated" },
    { ...metric, variant: "baseline" },
  ],
  recommendations: [
    { position: 1, text: "Second" },
    { position: 0, text: "First" },
  ],
};
const saved = {
  id: bookmark,
  simulation_id: id,
  membership_id: member,
  created_at: "2026-10-20T10:00:00Z",
};
test("simulation adapter preserves stored results, decimals, negative balances and recommendations", () => {
  const adapted = scenarios.adaptSimulation(dto, company);
  assert.equal(adapted.result.baseline.revenue, 100.5);
  assert.equal(adapted.result.incrementalBalance, -10.25);
  assert.equal(adapted.modelVersion, "historical-v1");
  assert.deepEqual(adapted.result.recommendations, ["First", "Second"]);
  assert.throws(() => scenarios.adaptSimulation({ ...dto, company_id: member }, company));
  assert.throws(() =>
    scenarios.adaptSimulation({ ...dto, metrics: [dto.metrics[0], dto.metrics[0]] }, company),
  );
});
test("save, reload and delete use scoped API and accept empty 204; write failures are not success", async (t) => {
  const calls = [];
  let failing = false;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    if (failing) return Response.json({ detail: "unavailable" }, { status: 503 });
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    if (url.includes("saved-scenarios"))
      return Response.json(init.method === "POST" ? saved : [saved]);
    return Response.json(dto);
  });
  const result = scenarios.adaptSimulation(dto, company).result;
  assert.equal(await scenarios.createSimulation(company, member, result), id);
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.created_by_membership_id, member);
  assert.equal(payload.opportunity_id, null);
  assert.equal(payload.baseline.revenue, 100.5);
  await scenarios.bookmarkSimulation(company, member, id);
  const loaded = await scenarios.listRemoteScenarios(company, member);
  assert.equal(loaded[0].id, bookmark);
  assert.equal(loaded[0].result.incrementalBalance, -10.25);
  await scenarios.deleteRemoteScenario(company, bookmark);
  assert.ok(calls.every((c) => c.url.includes(`/companies/${company}/`)));
  failing = true;
  const before = calls.length;
  await assert.rejects(scenarios.createSimulation(company, member, result), /unavailable/);
  assert.equal(calls.length, before + 1);
});
test("bookmark conflict is success only when the same membership already saved the same simulation", async (t) => {
  let records = [saved];
  t.mock.method(globalThis, "fetch", async (url, init) =>
    init.method === "POST"
      ? Response.json({ detail: "Conflict" }, { status: 409 })
      : Response.json(records),
  );
  await scenarios.bookmarkSimulation(company, member, id);
  records = [];
  await assert.rejects(scenarios.bookmarkSimulation(company, member, id), /Conflict/);
});
test("assistant uses supplied records and distinguishes unavailable, empty and unsupported data", () => {
  const now = new Date(2026, 9, 20, 12);
  const risks = [
    {
      title: "Risco real",
      severity: "critico",
      impact: 12.5,
      probability: 50,
      deadline: "Hoje",
      recommendations: ["Ação real"],
    },
  ];
  const opportunities = [
    {
      title: "Economia real",
      benefitType: "cost_saving",
      potentialRevenue: 30,
      cost: 0,
      roi: null,
      horizon: "15 dias",
      action: "Negociar",
    },
  ];
  const answer = assistant.answerFromData(
    "Resumo da empresa",
    { risks, opportunities, events: [{ date: "2026-10-19", title: "Passado" }] },
    now,
  );
  assert.equal(answer.cards.find((c) => c.title === "Riscos críticos").value, "1");
  assert.match(answer.cards.find((c) => c.title === "Impacto exposto").value, /12,50/);
  assert.match(answer.bullets.join(" "), /economia potencial.*Não aplicável/);
  assert.equal(answer.cards.find((c) => c.title === "Eventos futuros").value, "0");
  assert.equal(answer.sources.length, 3);
  assert.equal(assistant.answerFromData("riscos", { risks: [] }, now).cards[0].value, "0");
  const missing = assistant.answerFromData("riscos", {}, now);
  assert.equal(missing.cards.length, 0);
  assert.match(missing.bullets[0], /indisponíveis/);
  const unsupported = assistant.answerFromData("Qual será a receita amanhã?", { risks }, now);
  assert.equal(unsupported.cards.length, 0);
  assert.match(unsupported.text, /Não tenho dados suficientes/);
});
test("assistant never substitutes mock records when every endpoint fails", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ detail: "offline" }, { status: 503 }),
  );
  await assert.rejects(
    assistant.askCompany(company, "Resumo da empresa"),
    /Não foi possível consultar/,
  );
});
