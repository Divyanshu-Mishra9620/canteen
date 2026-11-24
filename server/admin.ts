import { randomBytes } from "node:crypto";
import { Binary, type Document } from "mongodb";
import { DEFAULT_SETTINGS, slugify } from "../src/data/menu.js";
import { isValidMobile, normalizeMobile } from "../shared/rules.js";
import { adminConfigured, checkCredentials, clearSessionCookie, makeSessionCookie, requireAdmin } from "./auth.js";
import { getDb } from "./db.js";
import { ApiError, bool, int, optStr, readJson, sendJson, str, type Ctx } from "./http.js";
import { ORDER_STATUSES, seedDefaults, toAdminOrder, type OrderStatus } from "./models.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────────── Session ───────────── */

export async function login({ req, res }: Ctx) {
  const body = await readJson(req);
  const email = str(body.email, "Email", 3, 200);
  const password = typeof body.password === "string" ? body.password : "";
  if (!checkCredentials(req, email, password)) {
    await delay(600); // slows brute-forcing
    throw new ApiError(401, "bad_credentials", "Wrong email or password.");
  }
  sendJson(res, 200, { email }, { "Set-Cookie": makeSessionCookie(req, email.trim().toLowerCase()) });
}

export function logout({ req, res }: Ctx) {
  sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie(req) });
}

export function session({ req, res }: Ctx) {
  if (!adminConfigured()) {
    throw new ApiError(503, "setup", "Admin login isn't configured. Set ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET (see SETUP.md).");
  }
  sendJson(res, 200, { email: requireAdmin(req) });
}

/* ───────────── Orders ───────────── */

/** Newest orders plus everything since `since` (the owner's local midnight) for today's totals. */
export async function listOrders({ query, res }: Ctx) {
  const db = await getDb();
  const sinceRaw = query.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw) : new Date(Date.now() - 86_400_000);
  const orders = db.collection("orders");
  const [recent, today] = await Promise.all([
    orders.find({}, { projection: { confirmHash: 0 } }).sort({ createdAt: -1 }).limit(150).toArray(),
    orders.find({ createdAt: { $gte: since } }, { projection: { confirmHash: 0 } }).sort({ createdAt: -1 }).limit(1000).toArray(),
  ]);
  sendJson(res, 200, { recent: recent.map(toAdminOrder), today: today.map(toAdminOrder) });
}

export async function updateOrder({ req, res, parts }: Ctx) {
  const body = await readJson(req);
  const set: Document = { updatedAt: new Date() };
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
      throw new ApiError(422, "invalid", "That status isn't valid.");
    }
    set.status = body.status;
  }
  const db = await getDb();
  const orders = db.collection("orders");
  const id = { _id: parts[2] } as Document;
  if (body.confirmWhatsapp === true) {
    // The owner got the order on WhatsApp by other means (or the customer's tap didn't register).
    await orders.updateOne({ ...id, whatsappSentAt: null }, { $set: { whatsappSentAt: new Date() } });
  }
  const result = await orders.updateOne(id, { $set: set });
  if (!result.matchedCount) throw new ApiError(404, "not_found", "Order not found.");
  sendJson(res, 200, { ok: true });
}

/* ───────────── Menu ───────────── */

const EDITABLE_TEXT = { name: [2, 60], description: [0, 140] } as const;

function imageUrl(v: unknown): string {
  const s = optStr(v, "Image URL", 500);
  if (s && !s.startsWith("/") && !s.startsWith("https://")) {
    throw new ApiError(422, "invalid", "Image URL must be a path like /images/x.jpg or an https:// link.");
  }
  return s;
}

/** Validates only the fields that are present (so PATCH can send a subset). */
async function parseItem(body: Record<string, unknown>, db: Awaited<ReturnType<typeof getDb>>, full: boolean) {
  const out: Document = {};
  const has = (k: string) => body[k] !== undefined;
  const need = (k: string) => {
    if (full && !has(k)) throw new ApiError(422, "invalid", `${k} is required.`);
    return has(k);
  };
  if (need("name")) out.name = str(body.name, "Name", ...EDITABLE_TEXT.name);
  if (has("description")) out.description = optStr(body.description, "Description", EDITABLE_TEXT.description[1]);
  if (need("price")) out.price = int(body.price, "Price", 1, 10_000);
  if (need("prepTime")) out.prepTime = int(body.prepTime, "Prep time", 1, 240);
  if (need("isVeg")) out.isVeg = bool(body.isVeg, "Veg / non-veg");
  if (has("isRecommended")) out.isRecommended = bool(body.isRecommended, "Recommended");
  if (has("isAvailable")) out.isAvailable = bool(body.isAvailable, "Available");
  if (has("imageUrl")) out.imageUrl = imageUrl(body.imageUrl);
  if (need("category")) {
    out.category = str(body.category, "Category", 1, 80);
    if (!(await db.collection("categories").findOne({ _id: out.category } as Document))) {
      throw new ApiError(422, "invalid", "That category doesn't exist.");
    }
  }
  return out;
}

export async function createItem({ req, res }: Ctx) {
  const body = await readJson(req);
  const db = await getDb();
  const data = await parseItem(body, db, true);
  const menu = db.collection("menu");
  let id = slugify(String(data.name)) || "item";
  if (await menu.findOne({ _id: id } as Document)) id = `${id}-${randomBytes(2).toString("hex")}`;
  await menu.insertOne({ _id: id, description: "", imageUrl: "", isRecommended: false, isAvailable: true, ...data, orderCount: 0, position: Date.now() } as Document);
  sendJson(res, 201, { id });
}

export async function updateItem({ req, res, parts }: Ctx) {
  const body = await readJson(req);
  const db = await getDb();
  const patch = await parseItem(body, db, false);
  if (!Object.keys(patch).length) throw new ApiError(422, "invalid", "Nothing to update.");
  const result = await db.collection("menu").updateOne({ _id: parts[2] } as Document, { $set: patch });
  if (!result.matchedCount) throw new ApiError(404, "not_found", "Item not found.");
  sendJson(res, 200, { ok: true });
}

export async function deleteItem({ res, parts }: Ctx) {
  const db = await getDb();
  const doc = await db.collection("menu").findOneAndDelete({ _id: parts[2] } as Document);
  if (!doc) throw new ApiError(404, "not_found", "Item not found.");
  await removeUploadedImage(db, String(doc.imageUrl ?? ""));
  sendJson(res, 200, { ok: true });
}

/** Adds any default dishes/categories that are missing. Existing ones are left untouched. */
export async function restoreDefaults({ res }: Ctx) {
  const db = await getDb();
  sendJson(res, 200, { restored: await seedDefaults(db) });
}

/* ───────────── Categories ───────────── */

export async function createCategory({ req, res }: Ctx) {
  const body = await readJson(req);
  const name = str(body.name, "Name", 2, 40);
  const db = await getDb();
  const cats = db.collection("categories");
  let id = slugify(name) || "category";
  if (await cats.findOne({ _id: id } as Document)) id = `${id}-${randomBytes(2).toString("hex")}`;
  const last = await cats.find().sort({ order: -1 }).limit(1).toArray();
  await cats.insertOne({ _id: id, name, tagline: "", imageUrl: "", order: Number(last[0]?.order ?? 0) + 1 } as Document);
  sendJson(res, 201, { id });
}

export async function updateCategory({ req, res, parts }: Ctx) {
  const body = await readJson(req);
  const set: Document = {};
  if (body.name !== undefined) set.name = str(body.name, "Name", 2, 40);
  if (body.tagline !== undefined) set.tagline = optStr(body.tagline, "Tagline", 120);
  if (body.order !== undefined) set.order = int(body.order, "Order", 0, 10_000);
  if (body.imageUrl !== undefined) set.imageUrl = imageUrl(body.imageUrl);
  if (!Object.keys(set).length) throw new ApiError(422, "invalid", "Nothing to update.");
  const db = await getDb();
  const result = await db.collection("categories").updateOne({ _id: parts[2] } as Document, { $set: set });
  if (!result.matchedCount) throw new ApiError(404, "not_found", "Category not found.");
  sendJson(res, 200, { ok: true });
}

export async function deleteCategory({ res, parts }: Ctx) {
  const db = await getDb();
  if (await db.collection("menu").findOne({ category: parts[2] })) {
    throw new ApiError(409, "not_empty", "Move or delete the dishes in this category first.");
  }
  await db.collection("categories").deleteOne({ _id: parts[2] } as Document);
  sendJson(res, 200, { ok: true });
}

/* ───────────── Blocked numbers ───────────── */

export async function listBlocked({ res }: Ctx) {
  const db = await getDb();
  const docs = await db.collection("blockedUsers").find().sort({ date: -1 }).toArray();
  sendJson(res, 200, {
    blocked: docs.map((d) => ({
      mobile: String(d._id),
      name: String(d.name ?? ""),
      reason: String(d.reason ?? ""),
      date: d.date instanceof Date ? d.date.toISOString() : null,
    })),
  });
}

export async function blockNumber({ req, res }: Ctx) {
  const body = await readJson(req);
  const mobile = normalizeMobile(str(body.mobile, "Mobile number", 10, 20));
  if (!isValidMobile(mobile)) throw new ApiError(422, "invalid", "Enter a valid 10-digit mobile number.");
  const db = await getDb();
  await db
    .collection("blockedUsers")
    .updateOne(
      { _id: mobile } as Document,
      { $set: { mobile, name: optStr(body.name, "Name", 60), reason: optStr(body.reason, "Reason", 120), date: new Date() } },
      { upsert: true },
    );
  sendJson(res, 200, { ok: true });
}

export async function unblockNumber({ res, parts }: Ctx) {
  const db = await getDb();
  await db.collection("blockedUsers").deleteOne({ _id: parts[2] } as Document);
  sendJson(res, 200, { ok: true });
}

/* ───────────── Settings ───────────── */

export async function saveSettings({ req, res }: Ctx) {
  const body = await readJson(req);
  const whatsappNumber = normalizeMobile(str(body.whatsappNumber, "WhatsApp number", 10, 20));
  if (!isValidMobile(whatsappNumber)) throw new ApiError(422, "invalid", "Enter a valid 10-digit WhatsApp number.");
  const settings = {
    deliveryCharge: int(body.deliveryCharge, "Delivery charge", 0, 1000),
    freeDeliveryThreshold: int(body.freeDeliveryThreshold, "Free delivery threshold", 0, 100_000),
    whatsappNumber,
    isOpen: bool(body.isOpen, "Open / closed"),
  };
  const db = await getDb();
  await db.collection("settings").updateOne({ _id: "store" } as Document, { $set: settings }, { upsert: true });
  sendJson(res, 200, { settings: { ...DEFAULT_SETTINGS, ...settings } });
}

/* ───────────── Images (stored in MongoDB) ───────────── */

const MAX_IMAGE_BYTES = 1_000_000;

function sniff(bytes: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function uploadImage({ req, res }: Ctx) {
  const body = await readJson(req);
  const data = str(body.data, "Image", 100, MAX_IMAGE_BYTES * 2);
  const bytes = Buffer.from(data, "base64");
  if (bytes.length > MAX_IMAGE_BYTES) throw new ApiError(413, "too_large", "That image is too large (max 1 MB). Try a smaller one.");
  const contentType = sniff(bytes); // trust the bytes, not the claimed type
  if (!contentType) throw new ApiError(422, "invalid", "Upload a JPEG, PNG or WebP image.");
  const id = randomBytes(10).toString("hex");
  const db = await getDb();
  await db.collection("images").insertOne({ _id: id, contentType, data: new Binary(bytes), size: bytes.length, createdAt: new Date() } as Document);
  sendJson(res, 201, { url: `/api/images/${id}` });
}

export async function deleteImage({ res, parts }: Ctx) {
  const db = await getDb();
  await db.collection("images").deleteOne({ _id: parts[2] } as Document);
  sendJson(res, 200, { ok: true });
}

/** Deletes an uploaded photo when its dish goes away. Bundled /images/... files are left alone. */
async function removeUploadedImage(db: Awaited<ReturnType<typeof getDb>>, url: string) {
  const match = /^\/api\/images\/([a-f0-9]{20})$/.exec(url);
  if (match) await db.collection("images").deleteOne({ _id: match[1] } as Document);
}
