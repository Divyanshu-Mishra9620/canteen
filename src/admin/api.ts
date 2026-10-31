/**
 * Owner-only Firestore/Storage operations. Every write here is also guarded by the
 * security rules (firestore.rules / storage.rules): only UIDs listed in `admins` succeed.
 */
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectStorageEmulator, deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { DEFAULT_SETTINGS, SEED_CATEGORIES, SEED_MENU, slugify, type Category, type MenuItem, type Settings } from "../data/menu";
import { app, db } from "../lib/firebase";
import { usingEmulators } from "../lib/firebase-config";
import type { OrderLine } from "../lib/orders";
import type { CustomerLocation } from "../lib/location";

export const auth = app ? getAuth(app) : null;
export const storage = app && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? getStorage(app) : null;

if (usingEmulators) {
  if (auth) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  if (storage) connectStorageEmulator(storage, "127.0.0.1", 9199);
}

const fs = () => {
  if (!db) throw new Error("Firebase is not configured.");
  return db;
};

export async function isAdmin(uid: string) {
  return (await getDoc(doc(fs(), "admins", uid))).exists();
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
  createdAt: Date | null;
}

const toOrder = (id: string, d: DocumentData): AdminOrder => ({
  orderId: String(d.orderId ?? id),
  customer: { name: "", mobile: "", hostel: "", room: "", ...d.customer },
  note: String(d.note ?? ""),
  items: Array.isArray(d.items) ? d.items : [],
  itemCount: Number(d.itemCount ?? 0),
  subtotal: Number(d.subtotal ?? 0),
  deliveryCharge: Number(d.deliveryCharge ?? 0),
  grandTotal: Number(d.grandTotal ?? 0),
  location: typeof d.location?.lat === "number" ? (d.location as CustomerLocation) : null,
  status: (d.status ?? "New") as OrderStatus,
  createdAt: d.createdAt?.toDate?.() ?? null,
});

/** Most recent orders, newest first (single-field index: no composite index needed). */
export function subscribeRecentOrders(onData: (orders: AdminOrder[]) => void, onError: (e: Error) => void, max = 150) {
  return onSnapshot(
    query(collection(fs(), "orders"), orderBy("createdAt", "desc"), limit(max)),
    (snap) => onData(snap.docs.map((d) => toOrder(d.id, d.data()))),
    onError,
  );
}

/** Every order since local midnight, for the day's totals. */
export function subscribeTodayOrders(onData: (orders: AdminOrder[]) => void, onError: (e: Error) => void) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return onSnapshot(
    query(collection(fs(), "orders"), where("createdAt", ">=", Timestamp.fromDate(start)), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map((d) => toOrder(d.id, d.data()))),
    onError,
  );
}

export const setOrderStatus = (orderId: string, status: OrderStatus) =>
  updateDoc(doc(fs(), "orders", orderId), { status, updatedAt: serverTimestamp() });

/* ───────────── Menu ───────────── */

const EDITABLE: (keyof MenuItem)[] = ["name", "category", "price", "description", "isVeg", "prepTime", "imageUrl", "isAvailable", "isRecommended"];
const pick = (item: Partial<MenuItem>) => Object.fromEntries(EDITABLE.filter((k) => k in item).map((k) => [k, item[k]]));

/** Creates a new item (unique slug id) and returns its id. */
export async function createItem(item: Omit<MenuItem, "id" | "orderCount">) {
  let id = slugify(item.name) || "item";
  if ((await getDoc(doc(fs(), "menu", id))).exists()) id = `${id}-${Date.now().toString(36).slice(-4)}`;
  await setDoc(doc(fs(), "menu", id), { ...pick(item), orderCount: 0, position: Date.now() });
  return id;
}

export const updateItem = (id: string, patch: Partial<MenuItem>) => updateDoc(doc(fs(), "menu", id), pick(patch));

export async function deleteItem(item: MenuItem) {
  await deleteDoc(doc(fs(), "menu", item.id));
  await removeStoredImage(item.imageUrl);
}

/* ───────────── Images (Firebase Storage) ───────────── */

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

export async function uploadItemImage(file: File, key: string) {
  if (!storage) throw new Error("Image upload needs Firebase Storage (set VITE_FIREBASE_STORAGE_BUCKET). You can paste an image URL instead.");
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const fileRef = ref(storage, `menu/${key}-${Date.now()}.${ext}`);
  await uploadBytes(fileRef, blob, { contentType: blob.type, cacheControl: "public,max-age=31536000" });
  return getDownloadURL(fileRef);
}

/** Deletes an image we uploaded earlier; bundled /images/... paths are left alone. */
export async function removeStoredImage(url: string) {
  if (!storage || !url.includes("firebasestorage.googleapis.com")) return;
  try {
    await deleteObject(ref(storage, url));
  } catch {
    /* already gone */
  }
}

/* ───────────── Categories ───────────── */

export async function addCategory(name: string, order: number) {
  let id = slugify(name) || "category";
  if ((await getDoc(doc(fs(), "categories", id))).exists()) id = `${id}-${Date.now().toString(36).slice(-4)}`;
  await setDoc(doc(fs(), "categories", id), { name: name.trim(), tagline: "", imageUrl: "", order });
}

export const updateCategory = (id: string, patch: Partial<Omit<Category, "id">>) => updateDoc(doc(fs(), "categories", id), patch);
export const deleteCategory = (id: string) => deleteDoc(doc(fs(), "categories", id));

/* ───────────── Blocked users ───────────── */

export interface BlockedUser {
  mobile: string;
  name: string;
  reason: string;
  date: Date | null;
}

export function subscribeBlocked(onData: (list: BlockedUser[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(collection(fs(), "blockedUsers"), orderBy("date", "desc")),
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          mobile: d.id,
          name: String(d.data().name ?? ""),
          reason: String(d.data().reason ?? ""),
          date: d.data().date?.toDate?.() ?? null,
        })),
      ),
    onError,
  );
}

/** The document id IS the mobile number, which is what the order rule checks with exists(). */
export const blockUser = (mobile: string, name: string, reason: string) =>
  setDoc(doc(fs(), "blockedUsers", mobile), { mobile, name: name.trim(), reason: reason.trim(), date: serverTimestamp() });

export const unblockUser = (mobile: string) => deleteDoc(doc(fs(), "blockedUsers", mobile));

/* ───────────── Settings + first-run import ───────────── */

export const saveSettings = (patch: Partial<Settings>) => setDoc(doc(fs(), "settings", "store"), patch, { merge: true });

/** Writes the 6 default categories + 32 items (and default settings if missing) in one batch. */
export async function importDefaultMenu() {
  const db = fs();
  const batch = writeBatch(db);
  for (const { id, ...c } of SEED_CATEGORIES) batch.set(doc(db, "categories", id), c);
  for (const { id, ...item } of SEED_MENU) batch.set(doc(db, "menu", id), item);
  if (!(await getDoc(doc(db, "settings", "store"))).exists()) batch.set(doc(db, "settings", "store"), DEFAULT_SETTINGS);
  await batch.commit();
}

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
