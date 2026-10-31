import type { FirestoreError } from "firebase/firestore";
import { DEFAULT_SETTINGS, type Settings } from "../data/menu";
import { HOSTELS, SITE } from "../data/site";
import { isFirebaseConfigured } from "./firebase-config";
import { formatDistance, mapLinkFor, type CustomerLocation } from "./location";
import { toSettings } from "./normalize";
import { rupee } from "./utils";

export interface CustomerDetails {
  name: string;
  mobile: string;
  hostel: string;
  room: string;
}

export interface OrderLine {
  id: string;
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
}

export interface PlacedOrder {
  orderId: string;
  customer: CustomerDetails;
  note: string;
  items: OrderLine[];
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  /** Where the customer ordered from (required for saved orders; checked by the rules). */
  location: CustomerLocation | null;
  createdAt: Date;
}

export const isKnownHostel = (hostel: string) => (HOSTELS as readonly string[]).includes(hostel);

export type OrderErrorCode = "blocked" | "closed" | "setup" | "network";

export class OrderError extends Error {
  code: OrderErrorCode;
  constructor(code: OrderErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Delivery rule: below the threshold costs `deliveryCharge`, at/above it is free. */
export function getDelivery(subtotal: number, settings: Settings) {
  const threshold = settings.freeDeliveryThreshold;
  const isFree = subtotal >= threshold;
  return {
    charge: subtotal === 0 || isFree ? 0 : settings.deliveryCharge,
    isFree,
    remaining: Math.max(0, threshold - subtotal),
    progress: threshold > 0 ? Math.min(1, subtotal / threshold) : 1,
  };
}

/** Accepts "+91 98765 43210", "098765..." etc. and returns the bare 10 digits. */
export const normalizeMobile = (raw: string) => raw.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");
export const isValidMobile = (mobile: string) => /^[6-9]\d{9}$/.test(mobile);

export const whatsappTo = (number10: string, text: string) =>
  `https://wa.me/91${normalizeMobile(number10)}?text=${encodeURIComponent(text)}`;

const CUSTOMER_KEY = "techies-taste:customer";

export function loadCustomer(): CustomerDetails {
  const empty = { name: "", mobile: "", hostel: "", room: "" };
  try {
    const saved: CustomerDetails = { ...empty, ...JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}") };
    // Older saves may hold a free-typed hostel; make the customer pick from the list instead.
    return { ...saved, hostel: isKnownHostel(saved.hostel) ? saved.hostel : "" };
  } catch {
    return empty;
  }
}

export function saveCustomer(details: CustomerDetails) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(details));
  } catch {
    /* storage unavailable: details just won't be remembered */
  }
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Builds the order summary; `orderId` is empty for WhatsApp-only fallbacks. */
export function draftOrder(
  input: { customer: CustomerDetails; note: string; lines: OrderLine[]; location?: CustomerLocation | null },
  settings: Settings,
  orderId = "",
): PlacedOrder {
  const subtotal = input.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const deliveryCharge = getDelivery(subtotal, settings).charge;
  return {
    orderId,
    customer: input.customer,
    note: input.note.trim(),
    items: input.lines,
    itemCount: input.lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal,
    deliveryCharge,
    grandTotal: subtotal + deliveryCharge,
    location: input.location ?? null,
    createdAt: new Date(),
  };
}

function newOrderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `TT-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/**
 * Saves the order to Firestore (status "New") and bumps each item's orderCount in the same
 * atomic batch. Firestore rules reject the whole batch if the mobile number is blocked or
 * the canteen is closed, so a blocked user can never create an order, even with a modified client.
 */
export async function placeOrder(input: {
  customer: CustomerDetails;
  note: string;
  lines: OrderLine[];
  /** Verified to be inside the delivery radius (the rules check it again). */
  location: CustomerLocation;
  /** Only bump counts when the menu really lives in Firestore (not the bundled fallback). */
  bumpCounts: boolean;
}): Promise<{ order: PlacedOrder; saved: boolean }> {
  const build = (settings: Settings) => draftOrder(input, settings, newOrderId());

  // Demo mode: no backend configured. Nothing is saved; the WhatsApp hand-off still works.
  if (!isFirebaseConfigured) return { order: build(DEFAULT_SETTINGS), saved: false };

  // Firestore is loaded on demand so it never weighs down the first page load.
  const [{ db }, { doc, getDoc, increment, serverTimestamp, writeBatch }] = await Promise.all([
    import("./firebase"),
    import("firebase/firestore"),
  ]).catch(() => {
    throw new OrderError("network", "Couldn't reach the canteen. Check your internet and try again.");
  });
  if (!db) return { order: build(DEFAULT_SETTINGS), saved: false };

  // 1. Fresh settings: the authoritative open/closed flag and delivery rule.
  const settingsRef = doc(db, "settings", "store");
  let snap;
  try {
    // Unreachable/uncreated databases make the SDK retry forever, so cap the wait.
    snap = await withTimeout(getDoc(settingsRef), 12_000);
  } catch {
    throw new OrderError("network", "Couldn't reach the canteen right now. Check your internet, or send your order on WhatsApp.");
  }
  if (!snap.exists()) throw new OrderError("setup", "Online ordering isn't set up yet. Please order on WhatsApp.");
  const settings = toSettings(snap.data());
  if (!settings.isOpen) throw new OrderError("closed", "The canteen is closed right now. You can browse, but ordering is paused.");

  // 2. Order + orderCount bumps, all or nothing.
  const order = build(settings);
  const batch = writeBatch(db);
  batch.set(doc(db, "orders", order.orderId), {
    orderId: order.orderId,
    customer: order.customer,
    note: order.note,
    items: order.items,
    itemCount: order.itemCount,
    subtotal: order.subtotal,
    deliveryCharge: order.deliveryCharge,
    grandTotal: order.grandTotal,
    location: input.location,
    status: "New",
    createdAt: serverTimestamp(),
  });
  if (input.bumpCounts) {
    for (const line of input.lines) batch.update(doc(db, "menu", line.id), { orderCount: increment(line.qty) });
  }

  try {
    await withTimeout(batch.commit(), 20_000);
  } catch (err) {
    if (err instanceof TimeoutError) {
      // The SDK may still deliver the write later, so steer away from placing a duplicate.
      throw new OrderError("network", "We couldn't confirm your order. Your connection seems slow, so send it on WhatsApp instead of placing it again.");
    }
    if ((err as FirestoreError).code === "permission-denied") {
      // Hostel and distance are checked before we get here, so a denial means closed or blocked.
      const again = await getDoc(settingsRef).catch(() => null);
      if (again && !toSettings(again.data()).isOpen) {
        throw new OrderError("closed", "The canteen just closed. Ordering is paused.");
      }
      throw new OrderError("blocked", "Aap order nahi kar sakte. Canteen se contact karein.");
    }
    throw new OrderError("network", "Couldn't place the order. Check your internet and try again.");
  }
  return { order, saved: true };
}

/** Pre-filled WhatsApp text the customer sends to the owner. */
export function orderMessage(order: PlacedOrder) {
  const { customer } = order;
  return [
    `🍽️ *New order: ${SITE.name}*`,
    ...(order.orderId ? [`Order ID: *${order.orderId}*`] : []),
    "",
    `👤 Name: ${customer.name}`,
    `📱 Mobile: ${customer.mobile}`,
    `🏠 Hostel: ${customer.hostel}, Room ${customer.room}`,
    ...(order.location ? [`📍 ${formatDistance(order.location.distance)} from canteen: ${mapLinkFor(order.location)}`] : []),
    "",
    "🛒 *Items*",
    ...order.items.map((l) => `• ${l.qty} × ${l.name}: ${rupee(l.price * l.qty)}`),
    "",
    `Item total: ${rupee(order.subtotal)}`,
    `Delivery: ${order.deliveryCharge ? rupee(order.deliveryCharge) : "FREE"}`,
    `*Grand total: ${rupee(order.grandTotal)}*`,
    ...(order.note ? ["", `📝 Note: ${order.note}`] : []),
  ].join("\n");
}
