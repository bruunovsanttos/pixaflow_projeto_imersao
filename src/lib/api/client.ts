/** status 0 denotes configuration or transport failures without an HTTP response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}
type QueryParams = Record<string, string | number | boolean | undefined | null>;

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;
  const record = body as Record<string, unknown>;
  const detail = record["detail"] ?? record["message"];
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null) return "";
        const entry = item as Record<string, unknown>;
        const location = Array.isArray(entry["loc"]) ? entry["loc"].join(".") : "";
        return typeof entry["msg"] === "string"
          ? [location, entry["msg"]].filter(Boolean).join(": ")
          : "";
      })
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  return fallback;
}

async function request<T>(path: string, params: QueryParams, init: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL?.trim();
  if (!baseUrl) throw new ApiError(0, "VITE_API_URL não está configurada.");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  const url = `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}${suffix}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch (cause) {
    throw new ApiError(0, "Não foi possível conectar à API.", { cause });
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new ApiError(
      response.status,
      response.ok
        ? "A API retornou uma resposta JSON inválida."
        : `HTTP ${response.status}: ${response.statusText || "Falha na requisição"}`,
      { cause },
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      errorMessage(
        body,
        `HTTP ${response.status}: ${response.statusText || "Falha na requisição"}`,
      ),
    );
  return body as T;
}

export function get<T>(path: string, params: QueryParams = {}): Promise<T> {
  return request<T>(path, params, { method: "GET" });
}
export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(
    path,
    {},
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    },
  );
}
