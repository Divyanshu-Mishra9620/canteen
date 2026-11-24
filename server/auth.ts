import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { ApiError, clientIp, isHttps, parseCookies } from "./http.js";

/**
 * Owner login. One owner account, configured with environment variables:
 *   ADMIN_EMAIL, ADMIN_PASSWORD  – the credentials
 *   SESSION_SECRET               – long random string used to sign the session cookie
 * The session lives in an HttpOnly cookie: it is never readable by page scripts and
 * never stored in localStorage.
 */
export const COOKIE = "tt_admin";
const SESSION_HOURS = 12;

const sha = (s: string) => createHash("sha256").update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

function secret() {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new ApiError(503, "setup", "SESSION_SECRET isn't set (use a long random string). See SETUP.md.");
  }
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function adminConfigured() {
  return Boolean(process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET?.trim());
}

/* Best-effort brute-force brake: per instance + per IP. (Serverless instances reset, so the
   constant delay on failure and the strong password matter more than this counter.) */
const failures = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 8;

export function checkCredentials(req: IncomingMessage, email: string, password: string): boolean {
  if (!adminConfigured()) {
    throw new ApiError(503, "setup", "Admin login isn't configured. Set ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET (see SETUP.md).");
  }
  const ip = clientIp(req);
  const now = Date.now();
  const entry = failures.get(ip);
  if (entry && now - entry.first > WINDOW_MS) failures.delete(ip);
  if ((failures.get(ip)?.count ?? 0) >= MAX_FAILURES) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again in a few minutes.");
  }
  const okEmail = safeEqual(email.trim().toLowerCase(), process.env.ADMIN_EMAIL!.trim().toLowerCase());
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD!);
  const ok = okEmail && okPass;
  if (!ok) {
    const cur = failures.get(ip);
    failures.set(ip, { count: (cur?.count ?? 0) + 1, first: cur?.first ?? now });
  } else {
    failures.delete(ip);
  }
  return ok;
}

export function makeSessionCookie(req: IncomingMessage, email: string): string {
  const exp = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  return cookie(req, `${payload}.${sign(payload)}`, SESSION_HOURS * 3600);
}

export const clearSessionCookie = (req: IncomingMessage) => cookie(req, "", 0);

function cookie(req: IncomingMessage, value: string, maxAge: number) {
  const secure = isHttps(req) ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

/** Returns the signed-in owner's email, or throws 401. */
export function requireAdmin(req: IncomingMessage): string {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  const bad = () => new ApiError(401, "unauthorized", "Please sign in.");
  if (!token) throw bad();
  const dot = token.lastIndexOf(".");
  if (dot < 1) throw bad();
  const payload = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = sign(payload);
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) throw bad();
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    if (typeof data.exp !== "number" || data.exp < Date.now() || typeof data.email !== "string") throw bad();
    return data.email;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw bad();
  }
}
