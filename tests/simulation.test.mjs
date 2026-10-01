import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(path, replacements = {}) {
  let code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(`"${from}"`, JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
const storageModule = compile("../src/lib/demo-storage.ts");
const data = await import(
  compile("../src/lib/mock-data.ts", {
    "./demo-storage": storageModule,
    zod: import.meta.resolve("zod"),
  })
);
const input = (kind, amount, extra = {}) => ({ kind, amount, question: "Teste", ...extra });

test("zero change preserves all baseline metrics for every decision", () => {
  for (const option of data.decisionOptions) {
    const result = data.calculateSimulation(
      input(option.id, 0, { opportunityId: "capacidade-ociosa" }),
    );
    assert.deepEqual(result.simulated, result.baseline);
    assert.equal(result.incrementalBalance, 0);
    assert.equal(result.initialCapital, 0);
  }
});
test("marketing overloads capacity; hiring adds cost without inventing demand", () => {
  const marketing = data.calculateSimulation(input("marketing", 30));
  const hire = data.calculateSimulation(input("hire", 1));
  assert.ok(marketing.simulated.capacity > 100);
  assert.ok(hire.simulated.capacity < hire.baseline.capacity);
  assert.equal(hire.simulated.revenue, hire.baseline.revenue);
  assert.equal(hire.additionalCost, 3200);
  assert.equal(hire.incrementalBalance, -3200);
});
test("discount changes both demand and price; stock benefits saturate", () => {
  const price = data.calculateSimulation(input("price", 10));
  assert.equal(price.simulated.revenue, Math.round(37000 * 1.15 * 0.9));
  const stock40 = data.calculateSimulation(input("stock", 40));
  const stock80 = data.calculateSimulation(input("stock", 80));
  assert.equal(stock40.simulated.revenue, stock80.simulated.revenue);
  assert.ok(stock80.incrementalBalance < stock40.incrementalBalance);
});
test("opportunities use their own costs and matching baseline horizon", () => {
  const r = data.calculateSimulation(input("opportunity", 100, { opportunityId: "recompra" }));
  assert.equal(r.horizon, "21 dias");
  assert.equal(r.baseline.revenue, 25900);
  assert.equal(r.simulated.revenue - r.baseline.revenue, 4120);
  assert.equal(r.additionalCost, 380);
  assert.equal(r.incrementalBalance, 3740);
});
test("invalid amounts and missing opportunities fail explicitly", () => {
  for (const amount of [-1, NaN, Infinity, 101, 1.5])
    assert.throws(() => data.calculateSimulation(input("marketing", amount)));
  assert.throws(() => data.calculateSimulation(input("opportunity", 100)));
});
test("saved scenarios survive reload, can be removed, and storage failures surface", async () => {
  const map = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
    },
  };
  const saved = await data.saveScenario(input("marketing", 30));
  assert.equal((await data.listScenarios())[0].id, saved[0].id);
  assert.equal((await data.deleteScenario(saved[0].id)).length, 0);
  map.set("nexora.scenarios.v1", "broken json");
  await assert.rejects(data.listScenarios());
  map.clear();
  window.localStorage.setItem = () => {
    throw new Error("storage blocked");
  };
  await assert.rejects(data.saveScenario(input("hire", 1)));
  delete globalThis.window;
});
