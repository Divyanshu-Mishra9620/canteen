/** Thin fetch wrapper for the backend (/api). Same-origin, so the owner's session cookie rides along. */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface Options {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Lets a request finish even if the page is closing (used for the WhatsApp confirmation). */
  keepalive?: boolean;
  timeoutMs?: number;
}

export async function api<T = unknown>(path: string, { method = "GET", body, keepalive, timeoutMs = 15_000 }: Options = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network", "Couldn't reach the server. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "server_error", err?.message ?? "Something went wrong. Please try again.");
  }
  // A 200 that isn't JSON means the site is being served without its backend (e.g. a static host).
  if (data === null) throw new ApiError(502, "no_api", "The ordering server isn't available.");
  return data as T;
}
