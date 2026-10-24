/** Same-origin cookie gateway; the upstream is deployment configuration, never user input. */

function getPublicOrigin(request: Request): string {
  const requestUrl = new URL(request.url);

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  const host =
    forwardedHost ??
    request.headers.get("host") ??
    requestUrl.host;

  const protocol =
    forwardedProto ??
    requestUrl.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

export async function proxyApi(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const origin = process.env["NEXORA_API_ORIGIN"];

  if (!origin) {
    return Response.json(
      { detail: "API não configurada no servidor." },
      { status: 503 },
    );
  }

  const target = new URL(origin);

  if (
    !["https:", "http:"].includes(target.protocol) ||
    target.pathname !== "/" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  ) {
    return Response.json(
      { detail: "Configuração inválida da API." },
      { status: 503 },
    );
  }

  if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
    return new Response(null, { status: 405 });
  }

  const browserOrigin = request.headers.get("origin");
  const publicOrigin = getPublicOrigin(request);

  if (
    request.method !== "GET" &&
    browserOrigin &&
    browserOrigin !== publicOrigin
  ) {
    return Response.json(
      { detail: "Origem não autorizada." },
      { status: 403 },
    );
  }

  const headers = new Headers({
    Accept: "application/json",
  });

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith("nexora_session="))
    .join("; ");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  /*
   * O FastAPI deve receber a origem pública real do frontend.
   * Não usamos request.url porque no Render ele pode apontar
   * para localhost/porta interna.
   */
  if (browserOrigin) {
    headers.set("origin", browserOrigin);
  } else {
    headers.set("origin", publicOrigin);
  }

  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  target.pathname = url.pathname;
  target.search = url.search;

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET"
          ? null
          : await request.arrayBuffer(),
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });

    const output = new Headers({
      "Cache-Control": "no-store",
    });

    const responseContentType =
      response.headers.get("content-type");

    if (responseContentType) {
      output.set(
        "content-type",
        responseContentType,
      );
    }

    const setCookie =
      response.headers.get("set-cookie");

    if (setCookie) {
      output.set("set-cookie", setCookie);
    }

    const retryAfter =
      response.headers.get("retry-after");

    if (retryAfter) {
      output.set("retry-after", retryAfter);
    }

    return new Response(response.body, {
      status: response.status,
      headers: output,
    });
  } catch {
    return Response.json(
      {
        detail:
          "Não foi possível conectar à API.",
      },
      { status: 502 },
    );
  }
}