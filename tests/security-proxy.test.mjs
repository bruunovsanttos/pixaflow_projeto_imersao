import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";
const source = fs.readFileSync(new URL("../src/lib/server/api-proxy.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { proxyApi } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
test("gateway requires a configured fixed upstream and same-origin writes", async (t) => {
  const previous = process.env.NEXORA_API_ORIGIN;
  t.after(() => {
    if (previous === undefined) delete process.env.NEXORA_API_ORIGIN;
    else process.env.NEXORA_API_ORIGIN = previous;
  });
  delete process.env.NEXORA_API_ORIGIN;
  assert.equal((await proxyApi(new Request("https://nexora.example/api/v1/auth/me"))).status, 503);
  process.env.NEXORA_API_ORIGIN = "https://api.example";
  assert.equal(
    (
      await proxyApi(
        new Request("https://nexora.example/api/v1/auth/login", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await proxyApi(new Request("https://nexora.example/api/v1/auth/login", { method: "POST" })))
      .status,
    403,
  );
  let forwarded;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    forwarded = { url, init };
    return Response.json(
      { ok: true },
      { headers: { "set-cookie": "nexora_session=test; HttpOnly; Secure; SameSite=Lax" } },
    );
  });
  const response = await proxyApi(
    new Request("https://nexora.example/api/v1/auth/login", {
      method: "POST",
      headers: {
        origin: "https://nexora.example",
        cookie: "unrelated=secret; nexora_session=opaque",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert.equal(forwarded.url.origin, "https://api.example");
  assert.equal(forwarded.url.pathname, "/api/v1/auth/login");
  assert.equal(forwarded.init.headers.get("cookie"), "nexora_session=opaque");
  assert.equal(forwarded.init.redirect, "error");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
});
