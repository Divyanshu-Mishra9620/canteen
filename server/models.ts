import type { Db, Document } from "mongodb";
import { DEFAULT_SETTINGS, SEED_CATEGORIES, SEED_MENU, type Category, type MenuItem, type Settings } from "../src/data/menu.js";

/* ───── Document ⇄ API shape ───── */

export const toItem = (d: Document): MenuItem => ({
  id: String(d._id),
  name: String(d.name ?? ""),
  category: String(d.category ?? ""),
  price: Number(d.price ?? 0),
  isVeg: d.isVeg !== false,
  description: String(d.description ?? ""),
  imageUrl: String(d.imageUrl ?? ""),
  prepTime: Number(d.prepTime ?? 10),
  isRecommended: Boolean(d.isRecommended),
  isAvailable: d.isAvailable !== false,
  orderCount: Number(d.orderCount ?? 0),
  tags: Array.isArray(d.tags) ? d.tags : undefined,
  position: typeof d.position === "number" ? d.position : undefined,
});

export const toCategory = (d: Document): Category => ({
  id: String(d._id),
  name: String(d.name ?? d._id),
  tagline: String(d.tagline ?? ""),
  imageUrl: String(d.imageUrl ?? ""),
  order: Number(d.order ?? 99),
});

export const toSettings = (d: Document | null | undefined): Settings => ({
  deliveryCharge: Number(d?.deliveryCharge ?? DEFAULT_SETTINGS.deliveryCharge),
  freeDeliveryThreshold: Number(d?.freeDeliveryThreshold ?? DEFAULT_SETTINGS.freeDeliveryThreshold),
  whatsappNumber: String(d?.whatsappNumber ?? DEFAULT_SETTINGS.whatsappNumber),
  isOpen: d?.isOpen !== false,
});

/** Order as the owner sees it. The WhatsApp confirmation token hash never leaves the server. */
export const toAdminOrder = (d: Document) => ({
  orderId: String(d._id),
  customer: d.customer,
  note: String(d.note ?? ""),
  items: d.items ?? [],
  itemCount: Number(d.itemCount ?? 0),
  subtotal: Number(d.subtotal ?? 0),
  deliveryCharge: Number(d.deliveryCharge ?? 0),
  grandTotal: Number(d.grandTotal ?? 0),
  location: d.location ?? null,
  status: String(d.status ?? "New"),
  whatsappSentAt: d.whatsappSentAt instanceof Date ? d.whatsappSentAt.toISOString() : null,
  createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : null,
});

/* ───── First-run seeding ───── */

/** Inserts any default categories/items that are missing. Never overwrites the owner's edits. */
export async function seedDefaults(db: Db): Promise<number> {
  const menu = SEED_MENU.map(({ id, ...item }) => ({
    updateOne: { filter: { _id: id } as Document, update: { $setOnInsert: item }, upsert: true },
  }));
  const categories = SEED_CATEGORIES.map(({ id, ...c }) => ({
    updateOne: { filter: { _id: id } as Document, update: { $setOnInsert: c }, upsert: true },
  }));
  const [m] = await Promise.all([db.collection("menu").bulkWrite(menu), db.collection("categories").bulkWrite(categories)]);
  return m.upsertedCount;
}

/**
 * Settings are read on every request. The very first time the store settings don't exist, the
 * default menu is created too, so a brand-new database works with no manual import step.
 * (Seeding keys off the settings document, so deleting every dish later never re-seeds.)
 */
export async function getSettings(db: Db): Promise<Settings> {
  const col = db.collection("settings");
  let doc = await col.findOne({ _id: "store" } as Document);
  if (!doc) {
    await seedDefaults(db);
    await col.updateOne({ _id: "store" } as Document, { $setOnInsert: { ...DEFAULT_SETTINGS } }, { upsert: true });
    doc = await col.findOne({ _id: "store" } as Document);
  }
  return toSettings(doc);
}

export const ORDER_STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
