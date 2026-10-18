import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = fs.readFileSync(new URL("../src/lib/dashboard.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { dashboardKpis, upcomingEvents } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const demo = ["revenue", "risks", "opps", "efficiency"].map((id) => ({
  id,
  label: id,
  value: "fake",
  hint: "fake",
  trend: "up",
  tone: "primary",
}));
test("real totals use all risks, not just the three displayed; no invented trends", () => {
  const risks = [
    { severity: "critico", impact: 10.25 },
    { severity: "atencao", impact: 5.5 },
    ...Array.from({ length: 4 }, () => ({ severity: "critico", impact: 1 })),
  ];
  const cards = dashboardKpis(demo, risks, [{ benefitType: "cost_saving" }, {}]);
  assert.equal(cards[1].value, "5 críticos");
  assert.match(cards[1].hint, /6 riscos.*19,75/);
  assert.equal(cards[1].trend, "flat");
  assert.equal(cards[2].value, "2 oportunidades");
  assert.match(cards[0].label, /Demonstrativo/);
  assert.match(cards[3].hint, /Sem fonte na API/);
  assert.equal(demo[0].label, "revenue");
});
test("unavailable data is not a mock or zero; successful empty lists are zero", () => {
  assert.equal(dashboardKpis(demo, undefined, [])[1].value, "—");
  assert.equal(dashboardKpis(demo, [], undefined)[2].value, "—");
  assert.equal(dashboardKpis(demo, [], [])[1].value, "0 críticos");
  assert.equal(dashboardKpis(demo, [], [])[2].value, "0 oportunidades");
});
test("timeline includes today, excludes past, sorts and caps without mutating data", () => {
  const events = [22, 17, 19, 18, 21, 20].map((day) => ({
    id: String(day),
    date: `2026-10-${day}`,
  }));
  assert.deepEqual(
    upcomingEvents(events, new Date(2026, 9, 18, 12)).map((e) => e.id),
    ["18", "19", "20", "21"],
  );
  assert.equal(events[0].id, "22");
  assert.deepEqual(upcomingEvents(events, new Date(2026, 10, 1)), []);
});
