import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(name, replacements = {}, env = { VITE_API_URL: "http://127.0.0.1:8000/api/v1/" }) {
  let source = fs.readFileSync(new URL(`../src/lib/api/${name}.ts`, import.meta.url), "utf8");
  source = source.replaceAll("import.meta.env", JSON.stringify(env));
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
const clientUrl = compile("client");
const adaptersUrl = compile("adapters");
const client = await import(clientUrl);
const adapters = await import(adaptersUrl);
const replacements = { "./client": clientUrl, "./adapters": adaptersUrl };
const companies = await import(compile("companies", replacements));
const users = await import(compile("users", replacements));
const risks = await import(compile("risks", replacements));
const opportunities = await import(compile("opportunities", replacements));
const timeline = await import(compile("timeline", replacements));
const metadata = {
  id: "7ca06d33-908c-4086-a1da-0b4a09b7526a",
  company_id: "company",
  analysis_run_id: null,
  created_at: "2026-10-09T10:15:00-03:00",
  updated_at: "2026-10-09T13:15:00Z",
};
const risk = {
  ...metadata,
  title: "Risk",
  category: "Estoque",
  description: "Description",
  detail: "Detail",
  cause: "Cause",
  probability: "91.00",
  impact_amount: "8420.50",
  deadline_at: "2026-10-12T09:00:00-03:00",
  deadline_description: "3 dias",
  status: "Ativo",
  severity: "critico",
  recommendations: [
    { id: "b", position: 2, text: "Second" },
    { id: "a", position: 1, text: "First" },
  ],
};
const opportunity = {
  ...metadata,
  title: "Opportunity",
  description: "Description",
  action: "Action",
  benefit_type: "cost_saving",
  potential_amount: "1480.00",
  cost_amount: "0.00",
  extra_clients: 0,
  effort: "Baixo",
  horizon_days: 15,
  confidence: "91.00",
  roi: null,
};
const event = {
  ...metadata,
  event_date: "2026-10-09",
  title: "Event",
  severity: "normal",
  description: "Description",
  cause: "Cause",
  impact_description: "Impact",
  recommendations: risk.recommendations,
};
const company = { ...metadata, slug: "bella", name: "Bella", segment: "Beauty" };
const user = { ...metadata, name: "User", email: "user@example.com" };
const membership = { ...metadata, user_id: "user", job_title: "Manager" };
const preferences = {
  ...metadata,
  membership_id: "membership",
  alert_risks: true,
  alert_opportunities: false,
  alert_weekly: true,
  alert_capacity: false,
  horizon_days: 15,
  sensitivity: "equilibrada",
};

test("adapters preserve UUIDs, timezone, calendar dates, null ROI and benefit semantics", () => {
  const adapted = adapters.adaptRisk(risk);
  assert.equal(adapted.id, risk.id);
  assert.equal(adapted.impact, 8420.5);
  assert.equal(adapted.probability, 91);
  assert.equal(adapted.deadlineAt, risk.deadline_at);
  assert.equal(adapted.createdAt, metadata.created_at);
  assert.deepEqual(adapted.recommendations, ["First", "Second"]);
  assert.equal(risk.recommendations[0].text, "Second");
  const saving = adapters.adaptOpportunity(opportunity);
  assert.equal(saving.roi, null);
  assert.equal(saving.benefitType, "cost_saving");
  assert.equal(saving.potentialAmount, 1480);
  assert.equal(saving.horizon, "15 dias");
  assert.equal(adapters.adaptOpportunity({ ...opportunity, roi: "412.50" }).roi, 412.5);
  assert.equal(adapters.adaptOpportunity({ ...opportunity, roi: "0" }).roi, 0);
  assert.equal(adapters.adaptTimelineEvent(event).date, "2026-10-09");
  assert.deepEqual(adapters.adaptPreferences(preferences).alerts, {
    risks: true,
    opps: false,
    weekly: true,
    capacity: false,
  });
  assert.equal(adapters.adaptPreferences(preferences).horizon, "15");
  assert.throws(() => adapters.adaptRisk({ ...risk, impact_amount: "" }));
  assert.throws(() => adapters.adaptRisk({ ...risk, probability: "NaN" }));
});

test("all read functions use scoped endpoints and adapters; every filter survives encoding", async (t) => {
  let body;
  let last;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    last = { url: new URL(url), init };
    return Response.json(body);
  });
  const cases = [
    [() => companies.getCompanies(), [company], "/companies", "id", company.id],
    [() => companies.getCompany("company"), company, "/companies/company", "slug", "bella"],
    [() => users.getUser("user"), user, "/users/user", "email", user.email],
    [
      () => users.getCompanyMemberships("company"),
      [membership],
      "/companies/company/memberships",
      "jobTitle",
      "Manager",
    ],
    [
      () => users.getMembershipPreferences("membership"),
      preferences,
      "/memberships/membership/preferences",
      "horizon",
      "15",
    ],
    [
      () =>
        risks.getRisks("company", {
          category: "Estoque",
          severity: "critico",
          status: "Em análise",
          offset: 0,
          limit: 5,
        }),
      [risk],
      "/companies/company/risks",
      "impact",
      8420.5,
      { category: "Estoque", severity: "critico", status: "Em análise", offset: "0", limit: "5" },
    ],
    [
      () => risks.getRisk("company", "risk"),
      risk,
      "/companies/company/risks/risk",
      "impact",
      8420.5,
    ],
    [
      () =>
        opportunities.getOpportunities("company", {
          effort: "Baixo",
          benefit_type: "cost_saving",
          offset: 0,
          limit: 10,
        }),
      [opportunity],
      "/companies/company/opportunities",
      "cost",
      0,
      { effort: "Baixo", benefit_type: "cost_saving", offset: "0", limit: "10" },
    ],
    [
      () => opportunities.getOpportunity("company", "opportunity"),
      opportunity,
      "/companies/company/opportunities/opportunity",
      "roi",
      null,
    ],
    [
      () =>
        timeline.getTimelineEvents("company", {
          severity: "normal",
          data_inicio: "2026-10-01",
          data_fim: "2026-10-31",
          offset: 0,
          limit: 8,
        }),
      [event],
      "/companies/company/timeline-events",
      "date",
      "2026-10-09",
      {
        severity: "normal",
        data_inicio: "2026-10-01",
        data_fim: "2026-10-31",
        offset: "0",
        limit: "8",
      },
    ],
    [
      () => timeline.getTimelineEvent("company", "event"),
      event,
      "/companies/company/timeline-events/event",
      "impact",
      "Impact",
    ],
  ];
  for (const [call, response, path, key, value, query = {}] of cases) {
    body = response;
    const result = await call();
    assert.equal((Array.isArray(result) ? result[0] : result)[key], value);
    assert.equal(last.url.pathname, "/api/v1" + path);
    assert.deepEqual(Object.fromEntries(last.url.searchParams), query);
    assert.equal(last.init.method, "GET");
  }
  body = [];
  await risks.getRisks("company", { severity: undefined });
  assert.equal(last.url.search, "");
  body = company;
  await companies.getCompany("a/b");
  assert.equal(last.url.pathname, "/api/v1/companies/a%2Fb");
});

test("HTTP, validation, malformed JSON, network and missing configuration errors are consistent", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  for (const [reply, status, message] of [
    [Response.json({ detail: "Not found" }, { status: 404 }), 404, /Not found/],
    [
      Response.json(
        { detail: [{ loc: ["query", "limit"], msg: "Invalid limit" }] },
        { status: 422 },
      ),
      422,
      /query.limit: Invalid limit/,
    ],
    [new Response("<html>Error</html>", { status: 500 }), 500, /HTTP 500/],
    [new Response("invalid json"), 200, /JSON/],
    [new TypeError("offline"), 0, /API/],
  ]) {
    response = reply;
    await assert.rejects(
      client.get("/companies"),
      (error) =>
        error instanceof client.ApiError && error.status === status && message.test(error.message),
    );
  }
  const missing = await import(compile("client", {}, {}));
  await assert.rejects(
    missing.get("/companies"),
    (error) => error instanceof missing.ApiError && error.status === 0,
  );
});
