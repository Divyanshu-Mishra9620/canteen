import type { IncomingMessage, ServerResponse } from "node:http";
import * as admin from "./admin.js";
import { requireAdmin } from "./auth.js";
import { ApiError, sendJson, type Ctx } from "./http.js";
import * as pub from "./public.js";

/**
 * The whole backend is this one handler, so it runs unchanged on Vercel (api/index.ts)
 * and inside the Vite dev server (see vite.config.ts).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    // On Vercel, the rewrite in vercel.json passes the original path as ?__path=. Locally it's the URL itself.
    const rewritten = url.searchParams.get("__path");
    const rawPath = rewritten !== null ? rewritten : url.pathname.replace(/^\/api\/?/, "");
    url.searchParams.delete("__path");
    const parts = rawPath.split("/").filter(Boolean).map(decodeURIComponent);
    const method = (req.method ?? "GET").toUpperCase();
    const ctx: Ctx = { req, res, method, parts, query: url.searchParams };
    await route(ctx);
  } catch (err) {
    if (err instanceof ApiError) {
      sendJson(res, err.status, { error: { code: err.code, message: err.message } }, { "Cache-Control": "no-store" });
      return;
    }
    console.error("Unhandled API error:", err);
    sendJson(res, 500, { error: { code: "server_error", message: "Something went wrong on our side. Please try again." } }, { "Cache-Control": "no-store" });
  }
}

async function route(ctx: Ctx) {
  const { method, parts, res } = ctx;
  const [a, b, c] = parts;
  res.setHeader("Cache-Control", "no-store"); // overridden by the few cacheable routes

  /* ─── Public ─── */
  if (method === "GET" && a === "menu" && !b) return pub.getMenu(ctx);
  if (method === "POST" && a === "orders" && !b) return pub.createOrder(ctx);
  if (method === "POST" && a === "orders" && b && c === "whatsapp") return pub.confirmWhatsapp(ctx);
  if (method === "GET" && a === "images" && b) return pub.getImage(ctx);

  /* ─── Owner ─── */
  if (a === "admin") {
    if (method === "POST" && b === "login") return admin.login(ctx);
    if (method === "POST" && b === "logout") return admin.logout(ctx);
    if (method === "GET" && b === "session") return admin.session(ctx);

    requireAdmin(ctx.req); // everything below needs a signed-in owner

    if (method === "GET" && b === "orders") return admin.listOrders(ctx);
    if (method === "PATCH" && b === "orders" && c) return admin.updateOrder(ctx);

    if (method === "POST" && b === "menu" && c === "restore") return admin.restoreDefaults(ctx);
    if (method === "POST" && b === "menu" && !c) return admin.createItem(ctx);
    if (method === "PATCH" && b === "menu" && c) return admin.updateItem(ctx);
    if (method === "DELETE" && b === "menu" && c) return admin.deleteItem(ctx);

    if (method === "POST" && b === "categories" && !c) return admin.createCategory(ctx);
    if (method === "PATCH" && b === "categories" && c) return admin.updateCategory(ctx);
    if (method === "DELETE" && b === "categories" && c) return admin.deleteCategory(ctx);

    if (method === "GET" && b === "blocked" && !c) return admin.listBlocked(ctx);
    if (method === "POST" && b === "blocked" && !c) return admin.blockNumber(ctx);
    if (method === "DELETE" && b === "blocked" && c) return admin.unblockNumber(ctx);

    if (method === "PUT" && b === "settings") return admin.saveSettings(ctx);

    if (method === "POST" && b === "images" && !c) return admin.uploadImage(ctx);
    if (method === "DELETE" && b === "images" && c) return admin.deleteImage(ctx);
  }

  throw new ApiError(404, "not_found", "That endpoint doesn't exist.");
}
