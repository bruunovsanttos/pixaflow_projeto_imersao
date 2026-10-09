import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(name, replacements = {}) {
  const source = fs
    .readFileSync(new URL(`../src/lib/api/${name}.ts`, import.meta.url), "utf8")
    .replaceAll("import.meta.env", JSON.stringify({ VITE_API_URL: "http://localhost/api/v1" }));
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
const client = compile("client");
const adapters = compile("adapters");
const companies = compile("companies", { "./client": client, "./adapters": adapters });
const helper = await import(
  compile("company-data", { "./companies": companies, zod: import.meta.resolve("zod") })
);
const { getRisks } = await import(compile("risks", { "./client": client, "./adapters": adapters }));
const uuid = "ca27d98e-7a5e-5c65-93db-77f339e6cf02";
const company = {
  id: uuid,
  slug: "bellastudio",
  name: "Bella",
  segment: "Beauty",
  created_at: "2026-10-09T09:00:00-03:00",
  updated_at: "2026-10-09T09:00:00-03:00",
};
const risk = {
  id: "7ca06d33-908c-4086-a1da-0b4a09b7526a",
  company_id: uuid,
  analysis_run_id: null,
  created_at: company.created_at,
  updated_at: company.updated_at,
  title: "Real risk",
  category: "Estoque",
  description: "Description",
  detail: "Detail",
  cause: "Cause",
  probability: "91.00",
  impact_amount: "8420.50",
  deadline_at: null,
  deadline_description: "3 dias",
  status: "Ativo",
  severity: "critico",
  recommendations: [],
};

test("loads real company UUID and all pages before exposing API data", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    if (parsed.pathname === "/api/v1/companies") {
      return Response.json(
        parsed.searchParams.get("offset") === "0"
          ? Array.from({ length: 100 }, () => ({ ...company, slug: "another-company" }))
          : [company],
      );
    }
    assert.equal(parsed.pathname, `/api/v1/companies/${uuid}/risks`);
    return Response.json(
      parsed.searchParams.get("offset") === "0" ? Array.from({ length: 100 }, () => risk) : [risk],
    );
  });
  const result = await helper.loadCompanyData(uuid, getRisks, helper.riskListSchema);
  assert.equal(result.length, 101);
  assert.equal(result[0].impact, 8420.5);
  assert.deepEqual(
    calls.map((url) => url.searchParams.get("offset")),
    ["0", "100"],
  );
  assert.equal(helper.selectCompanyData(result, false, ["mock"]).source, "api");
});

test("empty real lists stay empty; unavailable or failed refresh uses the original mocks", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) =>
    Response.json(new URL(url).pathname.endsWith("/companies") ? [company] : []),
  );
  const result = await helper.loadCompanyData(uuid, getRisks, helper.riskListSchema);
  const fallback = ["original mock"];
  assert.deepEqual(helper.selectCompanyData(result, false, fallback), { data: [], source: "api" });
  assert.deepEqual(helper.selectCompanyData(undefined, false, fallback), {
    data: [],
    source: "loading",
  });
  const failed = helper.selectCompanyData(["old real data"], true, fallback);
  assert.equal(failed.data, fallback);
  assert.equal(failed.source, "mock");
});

test("HTTP errors, malformed adapted records, invalid company UUID and partial failures reject safely", async (t) => {
  let mode = "http";
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/companies"))
      return Response.json(mode === "company" ? [{ ...company, slug: "unrelated" }] : [company]);
    if (mode === "malformed") return Response.json([{ ...risk, title: null }]);
    if (mode === "partial" && parsed.searchParams.get("offset") === "0")
      return Response.json(Array.from({ length: 100 }, () => risk));
    return Response.json({ detail: "Unavailable" }, { status: 503 });
  });
  await assert.rejects(helper.loadCompanyData("invalid-id", getRisks, helper.riskListSchema));
  for (mode of ["http", "malformed", "partial"]) {
    await assert.rejects(helper.loadCompanyData(uuid, getRisks, helper.riskListSchema));
  }
});

test("timeout ends loading and prevents a late page from initiating more requests", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([company]));
  let finishPage;
  let calls = 0;
  const loadPage = () => {
    calls++;
    return new Promise((resolve) => {
      finishPage = resolve;
    });
  };
  await assert.rejects(
    helper.loadCompanyData(uuid, loadPage, helper.riskListSchema, 30),
    /Tempo limite/,
  );
  assert.equal(calls, 1);
  finishPage([]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 1);
});

test("timeline calendar dates keep their day and legacy mock labels remain intact", () => {
  assert.equal(helper.formatTimelineDate("2026-10-09"), "09/10/2026");
  assert.equal(helper.formatTimelineDate("Hoje"), "Hoje");
  assert.equal(helper.formatTimelineDate("Em 3 dias"), "Em 3 dias");
});

test("opportunity display fits the card without changing financial data", () => {
  const opportunity = { roi: 984.2105263157895, benefitType: "cost_saving" };
  assert.deepEqual(helper.opportunityLabels(opportunity), { roi: "984,21%", benefit: "Economia" });
  assert.equal(opportunity.roi, 984.2105263157895);
  assert.equal(helper.opportunityLabels({ roi: null }).roi, "Não aplicável");
  assert.equal(helper.opportunityLabels({ roi: 0 }).roi, "0%");
  assert.equal(helper.opportunityLabels({ roi: 412.5 }).benefit, "Receita");
});
