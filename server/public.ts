import { createHash, randomBytes } from "node:crypto";
import { MongoServerError, type Document } from "mongodb";
import { HOSTELS, SITE } from "../src/data/site.js";
import {
  MAX_DISTINCT_ITEMS,
  MAX_QTY_PER_ITEM,
  distanceFromCanteen,
  getDelivery,
  isKnownHostel,
  isValidMobile,
  isWithinDeliveryRadius,
  normalizeMobile,
} from "../shared/rules.js";
import { getDb } from "./db.js";
import { ApiError, int, isObj, num, optStr, readJson, sendJson, str, type Ctx } from "./http.js";
import { getSettings, toCategory, toItem } from "./models.js";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** GET /api/menu: everything the storefront needs in one call. */
export async function getMenu({ res }: Ctx) {
  const db = await getDb();
  const settings = await getSettings(db); // also seeds a brand-new database
  const [items, categories] = await Promise.all([
    db.collection("menu").find().toArray(),
    db.collection("categories").find().sort({ order: 1 }).toArray(),
  ]);
  sendJson(
    res,
    200,
    { items: items.map(toItem), categories: categories.map(toCategory), settings },
    // Short edge cache: menu changes show up within seconds, and ordering re-checks everything anyway.
    { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=20" },
  );
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newOrderId = () => `TT-${Array.from(randomBytes(6), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;

/** POST /api/orders: validates everything on the server and saves the order. */
export async function createOrder({ req, res }: Ctx) {
  const body = await readJson(req);

  /* 1. Shape and format. Nothing from the browser is trusted, prices included. */
  if (!isObj(body.customer)) throw new ApiError(422, "invalid", "Customer details are required.");
  const c = body.customer;
  const name = str(c.name, "Name", 2, 60);
  const mobile = normalizeMobile(str(c.mobile, "Mobile number", 10, 20));
  if (!isValidMobile(mobile)) throw new ApiError(422, "invalid", "Enter a valid 10-digit mobile number.");
  const hostel = str(c.hostel, "Hostel", 1, 40);
  if (!isKnownHostel(hostel)) throw new ApiError(422, "invalid", `Choose your hostel from the list (${HOSTELS.join(", ")}).`);
  const room = str(c.room, "Room number", 1, 20);
  const note = optStr(body.note, "Cooking instructions", 300);

  if (!isObj(body.location)) throw new ApiError(403, "location", "Location access is required to order.");
  const lat = num(body.location.lat, "Location");
  const lng = num(body.location.lng, "Location");
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ApiError(422, "invalid", "That location isn't valid.");
  const accuracy = Math.min(100_000, Math.max(0, num(body.location.accuracy ?? 0, "Location accuracy")));

  if (!Array.isArray(body.items) || body.items.length === 0) throw new ApiError(422, "invalid", "Your cart is empty.");
  const wanted = new Map<string, number>();
  for (const raw of body.items) {
    if (!isObj(raw)) throw new ApiError(422, "invalid", "That cart isn't valid.");
    const id = str(raw.id, "Item", 1, 80);
    const qty = int(raw.qty, "Quantity", 1, MAX_QTY_PER_ITEM);
    wanted.set(id, Math.min(MAX_QTY_PER_ITEM, (wanted.get(id) ?? 0) + qty));
  }
  if (wanted.size > MAX_DISTINCT_ITEMS) throw new ApiError(422, "invalid", "That's too many different items in one order.");

  /* 2. Store rules. */
  const db = await getDb();
  const settings = await getSettings(db);
  if (!settings.isOpen) throw new ApiError(403, "closed", "The canteen is closed right now. You can browse, but ordering is paused.");

  const blocked = await db.collection("blockedUsers").findOne({ _id: mobile } as Document);
  if (blocked) throw new ApiError(403, "blocked", "Aap order nahi kar sakte. Canteen se contact karein.");

  const distance = Math.round(distanceFromCanteen(lat, lng));
  if (!isWithinDeliveryRadius(lat, lng)) {
    throw new ApiError(403, "range", `We take orders only within ${SITE.deliveryRadiusM} m of the canteen. You're about ${distance} m away.`);
  }

  /* 3. Prices and availability come from the database. */
  const docs = await db
    .collection("menu")
    .find({ _id: { $in: [...wanted.keys()] } } as Document)
    .toArray();
  const byId = new Map(docs.map((d) => [String(d._id), toItem(d)]));
  const missing = [...wanted.keys()].filter((id) => !byId.has(id));
  if (missing.length) throw new ApiError(409, "stock", "Some items in your cart are no longer on the menu. Please review your cart.");
  const soldOut = [...wanted.keys()].map((id) => byId.get(id)!).filter((i) => !i.isAvailable);
  if (soldOut.length) {
    throw new ApiError(409, "stock", `${soldOut.map((i) => i.name).join(", ")} ${soldOut.length > 1 ? "are" : "is"} out of stock right now. Remove ${soldOut.length > 1 ? "them" : "it"} and try again.`);
  }

  /* 4. Prank brake: a cap per number, and little patience for orders never sent on WhatsApp. */
  const orders = db.collection("orders");
  const hourAgo = new Date(Date.now() - 3_600_000);
  const [recent, unsent] = await Promise.all([
    orders.countDocuments({ "customer.mobile": mobile, createdAt: { $gte: hourAgo } }),
    orders.countDocuments({ "customer.mobile": mobile, createdAt: { $gte: hourAgo }, whatsappSentAt: null, status: "New" }),
  ]);
  if (recent >= 6 || unsent >= 3) {
    throw new ApiError(429, "limit", "You've placed several orders recently. Please wait a little, or call the canteen.");
  }

  /* 5. Totals, computed here. */
  const items = [...wanted.entries()].map(([id, qty]) => {
    const i = byId.get(id)!;
    return { id, name: i.name, price: i.price, qty, isVeg: i.isVeg };
  });
  const subtotal = items.reduce((sum, l) => sum + l.price * l.qty, 0);
  const deliveryCharge = getDelivery(subtotal, settings).charge;
  const confirmToken = randomBytes(18).toString("base64url");
  const now = new Date();

  const doc = {
    customer: { name, mobile, hostel, room },
    note,
    items,
    itemCount: items.reduce((sum, l) => sum + l.qty, 0),
    subtotal,
    deliveryCharge,
    grandTotal: subtotal + deliveryCharge,
    location: { lat: +lat.toFixed(6), lng: +lng.toFixed(6), accuracy: Math.round(accuracy), distance },
    status: "New",
    /** Set when the customer taps "Send on WhatsApp" (or the owner confirms by hand). */
    whatsappSentAt: null as Date | null,
    confirmHash: sha256(confirmToken),
    createdAt: now,
    updatedAt: now,
  };

  let orderId = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    orderId = newOrderId();
    try {
      await orders.insertOne({ _id: orderId, orderId, ...doc } as Document);
      break;
    } catch (err) {
      if (!(err instanceof MongoServerError && err.code === 11000) || attempt === 4) throw err;
    }
  }

  // "Popular" counters: best effort, never fails the order.
  await db
    .collection("menu")
    .bulkWrite(items.map((l) => ({ updateOne: { filter: { _id: l.id } as Document, update: { $inc: { orderCount: l.qty } } } })))
    .catch((err) => console.error("orderCount update failed:", (err as Error).message));

  sendJson(res, 201, {
    order: {
      orderId,
      customer: doc.customer,
      note,
      items,
      itemCount: doc.itemCount,
      subtotal,
      deliveryCharge,
      grandTotal: doc.grandTotal,
      location: doc.location,
      createdAt: now.toISOString(),
    },
    confirmToken,
    whatsappNumber: settings.whatsappNumber,
  });
}

/**
 * POST /api/orders/:id/whatsapp: the customer tapped "Send order on WhatsApp".
 * Needs the secret token returned when the order was created, so nobody else can confirm it.
 */
export async function confirmWhatsapp({ req, res, parts }: Ctx) {
  const body = await readJson(req);
  const id = parts[1];
  const token = str(body.token, "Token", 10, 100);
  const db = await getDb();
  const orders = db.collection("orders");
  const match = { _id: id, confirmHash: sha256(token) } as Document;
  const order = await orders.findOne(match, { projection: { whatsappSentAt: 1 } });
  if (!order) throw new ApiError(403, "invalid_token", "That order couldn't be confirmed.");
  if (!order.whatsappSentAt) {
    await orders.updateOne({ ...match, whatsappSentAt: null }, { $set: { whatsappSentAt: new Date(), updatedAt: new Date() } });
  }
  sendJson(res, 200, { ok: true });
}

/** GET /api/images/:id: menu photos uploaded from the dashboard (stored in MongoDB). */
export async function getImage({ res, parts }: Ctx) {
  const db = await getDb();
  const doc = await db.collection("images").findOne({ _id: parts[1] } as Document);
  if (!doc?.data) throw new ApiError(404, "not_found", "Image not found.");
  const bytes = Buffer.from((doc.data as { buffer: Uint8Array }).buffer);
  res.statusCode = 200;
  res.setHeader("Content-Type", String(doc.contentType ?? "image/webp"));
  res.setHeader("Content-Length", String(bytes.length));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(bytes);
}
