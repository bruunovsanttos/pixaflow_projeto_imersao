import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(file, replacements = {}) {
  const source = fs
    .readFileSync(new URL("../src/lib/" + file + ".ts", import.meta.url), "utf8")
    .replaceAll("import.meta.env", JSON.stringify({ VITE_API_URL: "http://localhost/api/v1" }));
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(JSON.stringify(from), JSON.stringify(to));
  return "data:text/javascript;base64," + Buffer.from(code).toString("base64");
}
const client = compile("api/client");
const adapters = compile("api/adapters");
const companies = compile("api/companies", { "./client": client, "./adapters": adapters });
const usersUrl = compile("api/users", { "./client": client, "./adapters": adapters });
const storage = compile("demo-storage", { zod: import.meta.resolve("zod") });
const mock = compile("mock-data", { "./demo-storage": storage, zod: import.meta.resolve("zod") });
const identity = await import(
  compile("api/identity", {
    "./companies": companies,
    "./users": usersUrl,
    "../mock-data": mock,
    zod: import.meta.resolve("zod"),
  })
);
const users = await import(usersUrl);
const timestamps = {
  created_at: "2026-10-09T09:00:00-03:00",
  updated_at: "2026-10-09T09:00:00-03:00",
};
const company = {
  ...timestamps,
  id: "10000000-0000-4000-8000-000000000001",
  slug: "different-business",
  name: "Outra Empresa",
  segment: "Serviços",
};
const user = {
  ...timestamps,
  id: "20000000-0000-4000-8000-000000000002",
  name: "Ana Silva",
  email: "ana@example.com",
};
const membership = {
  ...timestamps,
  id: "30000000-0000-4000-8000-000000000003",
  company_id: company.id,
  user_id: user.id,
  job_title: "Gestora",
};
const preferences = {
  ...timestamps,
  membership_id: membership.id,
  alert_risks: false,
  alert_opportunities: true,
  alert_weekly: false,
  alert_capacity: true,
  horizon_days: 30,
  sensitivity: "agressiva",
};
function responseFor(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/api/v1/companies") return [company];
  if (pathname === "/api/v1/companies/" + company.id) return company;
  if (pathname.endsWith("/memberships")) return [membership];
  if (pathname.endsWith("/preferences")) return preferences;
  if (pathname === "/api/v1/users/" + user.id) return user;
  throw Error("Unexpected endpoint " + pathname);
}
test("identity follows real IDs, accepts another slug and maps user, membership and preferences", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return Response.json(responseFor(url));
  });
  const current = await identity.loadCurrentCompany();
  const result = await identity.loadIdentity(current);
  assert.equal(result.company.slug, "different-business");
  assert.equal(result.user.id, result.membership.userId);
  assert.equal(result.company.id, result.membership.companyId);
  assert.equal(result.preferences.membershipId, result.membership.id);
  assert.deepEqual(result.settings, {
    name: "Ana Silva",
    email: "ana@example.com",
    role: "Gestora",
    alerts: { risks: false, opps: true, weekly: false, capacity: true },
    horizon: "30",
    sensitivity: "agressiva",
  });
  assert.equal(result.user.createdAt, timestamps.created_at);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((url) => !url.includes("bellastudio")));
  assert.equal(identity.profileInitials(" Ana Silva "), "AS");
});
test("empty companies and memberships fail explicitly without inventing a user", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  await assert.rejects(identity.loadCurrentCompany(), /Nenhuma empresa/);
  await assert.rejects(
    identity.loadIdentity({
      ...company,
      createdAt: timestamps.created_at,
      updatedAt: timestamps.updated_at,
    }),
    /vínculo/,
  );
});
test("inconsistent company, user or preference relationships and malformed data are rejected", async (t) => {
  let mode;
  t.mock.method(globalThis, "fetch", async (url) => {
    let result = responseFor(url);
    if (url.includes("/memberships?") && mode === "company")
      result = [{ ...membership, company_id: user.id }];
    if (url.endsWith("/users/" + user.id) && mode === "user") result = { ...user, id: company.id };
    if (url.endsWith("/preferences") && mode === "preferences")
      result = { ...preferences, membership_id: user.id };
    if (url.endsWith("/preferences") && mode === "invalid")
      result = { ...preferences, alert_risks: null };
    return Response.json(result);
  });
  const current = await identity.loadCurrentCompany();
  for (mode of ["company", "user", "preferences", "invalid"])
    await assert.rejects(identity.loadIdentity(current));
});
test("PUT sends only preference fields and preserves false booleans and numeric horizon", async (t) => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    request = { url, init };
    return Response.json(preferences);
  });
  const result = await users.updateMembershipPreferences(membership.id, {
    name: "Must not be sent",
    email: "private@example.com",
    role: "Must not be sent",
    alerts: { risks: false, opps: true, weekly: false, capacity: true },
    horizon: "30",
    sensitivity: "agressiva",
  });
  assert.equal(request.init.method, "PUT");
  assert.equal(request.init.headers["Content-Type"], "application/json");
  assert.equal(
    request.url,
    "http://localhost/api/v1/memberships/" + membership.id + "/preferences",
  );
  assert.deepEqual(JSON.parse(request.init.body), {
    alert_risks: false,
    alert_opportunities: true,
    alert_weekly: false,
    alert_capacity: true,
    horizon_days: 30,
    sensitivity: "agressiva",
  });
  assert.equal(result.horizon, "30");
  assert.equal(result.alerts.risks, false);
});
test("failed writes stay failures, never report local success or retry silently", async (t) => {
  let count = 0;
  t.mock.method(globalThis, "fetch", async () => {
    count++;
    return Response.json({ detail: "Unavailable" }, { status: 503 });
  });
  await assert.rejects(
    users.updateMembershipPreferences(membership.id, {
      alerts: { risks: true, opps: true, weekly: true, capacity: false },
      horizon: "7",
      sensitivity: "equilibrada",
    }),
    (error) => error.status === 503,
  );
  assert.equal(count, 1);
});
test("identity timeout rejects a stalled read", async () => {
  await assert.rejects(
    identity.withIdentityTimeout(() => new Promise(() => {}), 20),
    /Tempo limite/,
  );
});
