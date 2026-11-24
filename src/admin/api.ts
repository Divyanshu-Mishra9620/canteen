/**
 * Owner-only calls to the backend. Every one of these is also enforced on the server: it
 * checks the signed session cookie, so nothing here works unless the owner is signed in.
 */
import type { Category, MenuItem, Settings } from "../data/menu";
import { ApiError, api } from "../lib/api";
import type { CustomerLocation } from "../lib/location";
import type { OrderLine } from "../lib/orders";

/* ───────────── Session ───────────── */

export const adminSession = () => api<{ email: string }>("/api/admin/session");

export const adminLogin = (email: string, password: string) =>
  api<{ email: string }>("/api/admin/login", { method: "POST", body: { email, password } });

export const adminLogout = () => api("/api/admin/logout", { method: "POST" });

/** Called when any request comes back 401 (e.g. the 12-hour session ended). */
const expiredListeners = new Set<() => void>();
export const onSessionExpired = (fn: () => void) => {
  expiredListeners.add(fn);
  return () => void expiredListeners.delete(fn);
};

/** Admin screens refetch immediately after a change instead of waiting for the next poll. */
const CHANGED = "admin:changed";
const notifyChanged = () => window.dispatchEvent(new Event(CHANGED));

/** Runs a mutation, then refreshes the live lists. */
async function mutate<T>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) {
  const result = await api<T>(path, { method, body }).catch((err) => {
    if (err instanceof ApiError && err.status === 401) expiredListeners.forEach((fn) => fn());
    throw err;
  });
  notifyChanged();
  return result;
}

/**
 * Keeps data fresh by polling. Errors are reported once per outage (not on every tick), and any
 * admin change triggers an immediate refresh.
 */
function poll<T>(path: string, onData: (data: T) => void, onError: (e: Error) => void, everyMs: number) {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let failing = false;

  const tick = async () => {
    if (running || !alive) return;
    running = true;
    clearTimeout(timer);
    try {
      const data = await api<T>(path);
      if (!alive) return;
      failing = false;
      onData(data);
    } catch (err) {
      if (!alive) return;
      if (err instanceof ApiError && err.status === 401) expiredListeners.forEach((fn) => fn());
      else if (!failing) onError(err as Error);
      failing = true;
    } finally {
      running = false;
      if (alive) timer = setTimeout(tick, everyMs);
    }
  };

  const kick = () => void tick();
  window.addEventListener(CHANGED, kick);
  void tick();
  return () => {
    alive = false;
    clearTimeout(timer);
    window.removeEventListener(CHANGED, kick);
  };
}

/* ───────────── Orders ───────────── */

export type OrderStatus = "New" | "Preparing" | "Ready" | "Delivered" | "Cancelled";
export const ACTIVE_STATUSES: OrderStatus[] = ["New", "Preparing", "Ready"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  New: "New",
  Preparing: "Preparing",
  Ready: "Ready / Out for delivery",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};
/** Next step in the kitchen flow, with the label for the button that moves an order there. */
export const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; action: string }>> = {
  New: { to: "Preparing", action: "Start preparing" },
  Preparing: { to: "Ready", action: "Ready / Out for delivery" },
  Ready: { to: "Delivered", action: "Mark delivered" },
};

export interface AdminOrder {
  orderId: string;
  customer: { name: string; mobile: string; hostel: string; room: string };
  note: string;
  items: OrderLine[];
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  location: CustomerLocation | null;
  status: OrderStatus;
  /** When the customer opened WhatsApp with this order (null = still waiting for them). */
  whatsappSentAt: Date | null;
  createdAt: Date | null;
}

type RawOrder = Omit<AdminOrder, "createdAt" | "whatsappSentAt"> & { createdAt: string | null; whatsappSentAt: string | null };
const parseOrder = (o: RawOrder): AdminOrder => ({
  ...o,
  createdAt: o.createdAt ? new Date(o.createdAt) : null,
  whatsappSentAt: o.whatsappSentAt ? new Date(o.whatsappSentAt) : null,
});

/** Orders are refreshed every few seconds, which is what makes the dashboard "live". */
const ORDERS_EVERY_MS = 4000;

/** Newest orders, plus everything since the owner's local midnight for today's totals. */
export function subscribeOrders(onData: (data: { recent: AdminOrder[]; today: AdminOrder[] }) => void, onError: (e: Error) => void) {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return poll<{ recent: RawOrder[]; today: RawOrder[] }>(
    `/api/admin/orders?since=${encodeURIComponent(midnight.toISOString())}`,
    (d) => onData({ recent: d.recent.map(parseOrder), today: d.today.map(parseOrder) }),
    onError,
    ORDERS_EVERY_MS,
  );
}

export const setOrderStatus = (orderId: string, status: OrderStatus) => mutate(`/api/admin/orders/${encodeURIComponent(orderId)}`, "PATCH", { status });

/** Owner confirms an order manually, e.g. the WhatsApp message arrived but the customer's tap didn't register. */
export const confirmOrderWhatsapp = (orderId: string) =>
  mutate(`/api/admin/orders/${encodeURIComponent(orderId)}`, "PATCH", { confirmWhatsapp: true });

/* ───────────── Menu ───────────── */

/** The same public endpoint the storefront uses (menu, categories, settings). */
export function subscribeMenu(
  onData: (data: { items: MenuItem[]; categories: Category[]; settings: Settings }) => void,
  onError: (e: Error) => void,
) {
  return poll("/api/menu", onData, onError, 15_000);
}

type ItemFields = Omit<MenuItem, "id" | "orderCount" | "position" | "tags">;

/** Creates a new item and returns its id. */
export async function createItem(item: ItemFields) {
  return (await mutate<{ id: string }>("/api/admin/menu", "POST", item)).id;
}

export const updateItem = (id: string, patch: Partial<ItemFields>) => mutate(`/api/admin/menu/${encodeURIComponent(id)}`, "PATCH", patch);

export const deleteItem = (item: MenuItem) => mutate(`/api/admin/menu/${encodeURIComponent(item.id)}`, "DELETE");

/** Adds any default dishes that are missing, leaving existing ones as they are. */
export const importDefaultMenu = () => mutate<{ restored: number }>("/api/admin/menu/restore", "POST");

/* ───────────── Images (stored in MongoDB) ───────────── */

/** Centre-crops to a square and re-encodes (WebP where supported) so cards load fast. */
async function compressImage(file: File, size = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(size, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))), "image/webp", 0.8),
  );
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(blob);
  });

/** Uploads a photo into the database and returns the URL to save on the item. */
export async function uploadItemImage(file: File, _key?: string) {
  const blob = await compressImage(file);
  const { url } = await mutate<{ url: string }>("/api/admin/images", "POST", { data: await toBase64(blob) });
  return url;
}

/** Deletes a photo we uploaded earlier; bundled /images/... files are left alone. */
export async function removeStoredImage(url: string) {
  const match = /^\/api\/images\/([a-f0-9]{20})$/.exec(url);
  if (match) await mutate(`/api/admin/images/${match[1]}`, "DELETE").catch(() => {});
}

/* ───────────── Categories ───────────── */

export const addCategory = (name: string, _order?: number) => mutate("/api/admin/categories", "POST", { name });
export const updateCategory = (id: string, patch: Partial<Omit<Category, "id">>) => mutate(`/api/admin/categories/${encodeURIComponent(id)}`, "PATCH", patch);
export const deleteCategory = (id: string) => mutate(`/api/admin/categories/${encodeURIComponent(id)}`, "DELETE");

/* ───────────── Blocked users ───────────── */

export interface BlockedUser {
  mobile: string;
  name: string;
  reason: string;
  date: Date | null;
}

export function subscribeBlocked(onData: (list: BlockedUser[]) => void, onError: (e: Error) => void) {
  return poll<{ blocked: (Omit<BlockedUser, "date"> & { date: string | null })[] }>(
    "/api/admin/blocked",
    (d) => onData(d.blocked.map((b) => ({ ...b, date: b.date ? new Date(b.date) : null }))),
    onError,
    10_000,
  );
}

export const blockUser = (mobile: string, name: string, reason: string) => mutate("/api/admin/blocked", "POST", { mobile, name, reason });
export const unblockUser = (mobile: string) => mutate(`/api/admin/blocked/${encodeURIComponent(mobile)}`, "DELETE");

/* ───────────── Settings ───────────── */

export const saveSettings = (settings: Settings) => mutate("/api/admin/settings", "PUT", settings);

/* ───────────── New-order chime ───────────── */

let audio: AudioContext | null = null;

/** Browsers only allow sound after a user gesture; call this from any click. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* no Web Audio */
  }
}

export function playChime() {
  if (!audio) return;
  const now = audio.currentTime;
  [880, 1320, 1760].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    const t = now + i * 0.16;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}
