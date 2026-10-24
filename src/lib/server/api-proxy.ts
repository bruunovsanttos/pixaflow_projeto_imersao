/** Same-origin cookie gateway; the upstream is deployment configuration, never user input. */
export async function proxyApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = process.env["NEXORA_API_ORIGIN"];
  if (!origin)
    return Response.json({ detail: "API não configurada no servidor." }, { status: 503 });
  const target = new URL(origin);
  if (
    !["https:", "http:"].includes(target.protocol) ||
    target.pathname !== "/" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  )
    return Response.json({ detail: "Configuração inválida da API." }, { status: 503 });
  if (!["GET", "POST", "PUT", "DELETE"].includes(request.method))
    return new Response(null, { status: 405 });
  if (request.method !== "GET" && request.headers.get("origin") !== url.origin)
    return Response.json({ detail: "Origem não autorizada." }, { status: 403 });
  const headers = new Headers({ Accept: "application/json" });
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith("nexora_session="))
    .join("; ");
  if (cookie) headers.set("cookie", cookie);
  if (request.headers.get("origin")) headers.set("origin", request.headers.get("origin")!);
  if (request.headers.get("content-type"))
    headers.set("content-type", request.headers.get("content-type")!);
  target.pathname = url.pathname;
  target.search = url.search;
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? null : await request.arrayBuffer(),
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    const output = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "set-cookie", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: output });
  } catch {
    return Response.json({ detail: "Não foi possível conectar à API." }, { status: 502 });
  }
}
