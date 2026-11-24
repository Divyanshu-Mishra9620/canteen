import type { IncomingMessage, ServerResponse } from "node:http";

/** Anything thrown as an ApiError becomes a clean JSON error for the client. */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  /** Path segments after /api, e.g. ["admin", "orders", "TT-ABC123"]. */
  parts: string[];
  query: URLSearchParams;
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(payload);
}

const MAX_BODY_BYTES = 2_500_000;

/** Reads a JSON body whether the host (Vercel) already parsed it or not. */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const type = String(req.headers["content-type"] ?? "");
  if (!type.includes("application/json")) {
    // Browsers can't send application/json cross-site without a CORS preflight, which we never grant.
    throw new ApiError(415, "bad_request", "Send JSON with Content-Type: application/json.");
  }
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  let raw: unknown = parsed;
  if (raw === undefined) {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY_BYTES) throw new ApiError(413, "too_large", "That request is too large.");
      chunks.push(chunk as Buffer);
    }
    raw = Buffer.concat(chunks).toString("utf8");
  }
  if (Buffer.isBuffer(raw)) raw = raw.toString("utf8");
  if (typeof raw === "string") {
    try {
      raw = raw.length ? JSON.parse(raw) : {};
    } catch {
      throw new ApiError(400, "bad_request", "That request wasn't valid JSON.");
    }
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new ApiError(400, "bad_request", "Expected a JSON object.");
  return raw as Record<string, unknown>;
}

/* ───── Strict input helpers: never trust the types of anything from the network ───── */

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Trimmed, control-character-free string within [min, max] characters. */
export function str(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== "string") throw new ApiError(422, "invalid", `${field} is required.`);
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (s.length < min) throw new ApiError(422, "invalid", `${field} is required.`);
  if (s.length > max) throw new ApiError(422, "invalid", `${field} is too long.`);
  return s;
}

export function optStr(v: unknown, field: string, max: number): string {
  if (v === undefined || v === null || v === "") return "";
  return str(v, field, 0, max);
}

export function int(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < min || v > max) {
    throw new ApiError(422, "invalid", `${field} must be a whole number between ${min} and ${max}.`);
  }
  return v;
}

export function bool(v: unknown, field: string): boolean {
  if (typeof v !== "boolean") throw new ApiError(422, "invalid", `${field} must be true or false.`);
  return v;
}

export function num(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ApiError(422, "invalid", `${field} must be a number.`);
  return v;
}

/* ───── Cookies ───── */

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isHttps(req: IncomingMessage) {
  return String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https";
}

export function clientIp(req: IncomingMessage) {
  return String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
}
