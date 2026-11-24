import type { Settings } from "../data/menu";
import { SITE } from "../data/site";
import { getDelivery, isKnownHostel, isValidMobile, normalizeMobile } from "../../shared/rules";
import { ApiError, api } from "./api";
import { formatDistance, mapLinkFor, type CustomerLocation } from "./location";
import { rupee } from "./utils";

// The rules live in shared/rules.ts so the website and the server always agree.
export { getDelivery, isKnownHostel, isValidMobile, normalizeMobile };

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
  /** Where the customer ordered from (checked again on the server). */
  location: CustomerLocation | null;
  createdAt: Date;
}

export type OrderErrorCode = "blocked" | "closed" | "setup" | "network" | "range" | "stock" | "limit" | "invalid" | "location";

export class OrderError extends Error {
  code: OrderErrorCode;
  constructor(code: OrderErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const whatsappTo = (number10: string, text: string) =>
  `https://wa.me/91${normalizeMobile(number10)}?text=${encodeURIComponent(text)}`;

/* ───────── Remembered details (a convenience only: orders live in the database) ───────── */

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

/* ───────── Placing an order ───────── */

/** Builds the order summary locally: used for the WhatsApp-only fallback when the server is down. */
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

export interface PlaceResult {
  order: PlacedOrder;
  /** Secret that lets this browser (only) confirm the WhatsApp step for this order. */
  confirmToken: string;
  whatsappNumber: string;
}

const SERVER_CODES: Record<string, OrderErrorCode> = {
  closed: "closed",
  blocked: "blocked",
  range: "range",
  location: "location",
  stock: "stock",
  limit: "limit",
  invalid: "invalid",
  setup: "setup",
};

/** Sends the order to the server, which re-checks everything and prices it from the database. */
export async function placeOrder(input: {
  customer: CustomerDetails;
  note: string;
  lines: OrderLine[];
  location: CustomerLocation;
}): Promise<PlaceResult> {
  try {
    const result = await api<{
      order: Omit<PlacedOrder, "createdAt"> & { createdAt: string };
      confirmToken: string;
      whatsappNumber: string;
    }>("/api/orders", {
      method: "POST",
      timeoutMs: 20_000,
      body: {
        customer: input.customer,
        note: input.note,
        items: input.lines.map((l) => ({ id: l.id, qty: l.qty })),
        location: input.location,
      },
    });
    return { ...result, order: { ...result.order, createdAt: new Date(result.order.createdAt) } };
  } catch (err) {
    if (err instanceof ApiError) {
      const code = SERVER_CODES[err.code];
      // "setup" is a message for the owner (missing MONGODB_URI...); customers get plain words.
      if (code === "setup") throw new OrderError("setup", "Online ordering isn't available yet. You can send your order straight to the canteen on WhatsApp instead.");
      if (code) throw new OrderError(code, err.message);
      // Server or database trouble, or no backend at all: offer the WhatsApp fallback.
      throw new OrderError("network", "We couldn't place your order online right now. You can send it straight to the canteen on WhatsApp instead.");
    }
    throw err;
  }
}

/* ───────── WhatsApp step (compulsory) ───────── */

/** Tells the server the customer tapped "Send order on WhatsApp". Survives the page navigating away. */
export const confirmWhatsapp = (orderId: string, token: string) =>
  api(`/api/orders/${encodeURIComponent(orderId)}/whatsapp`, { method: "POST", body: { token }, keepalive: true });

/**
 * An order stays "pending" on this device until its WhatsApp message has been opened, so a closed
 * tab or reload can't skip the step: the checkout comes back on the next visit.
 */
export interface PendingOrder {
  order: PlacedOrder;
  confirmToken: string;
  whatsappNumber: string;
  /** WhatsApp was opened, but the server hasn't acknowledged it yet. */
  tapped: boolean;
}

const PENDING_KEY = "techies-taste:pending-order";

export function loadPending(): PendingOrder | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as (Omit<PendingOrder, "order"> & { order: Omit<PlacedOrder, "createdAt"> & { createdAt: string } }) | null;
    if (!raw?.order?.orderId || !raw.confirmToken) return null;
    return { ...raw, order: { ...raw.order, createdAt: new Date(raw.order.createdAt) } };
  } catch {
    return null;
  }
}

export function savePending(pending: PendingOrder | null) {
  try {
    if (pending) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
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
