import type { DocumentData } from "firebase/firestore";
import { DEFAULT_SETTINGS, type Category, type MenuItem, type Settings } from "../data/menu";

/* Normalisers: tolerate missing fields on hand-edited or admin-created documents. */

export const toItem = (id: string, d: DocumentData): MenuItem => ({
  id,
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

export const toCategory = (id: string, d: DocumentData): Category => ({
  id,
  name: String(d.name ?? id),
  tagline: String(d.tagline ?? ""),
  imageUrl: String(d.imageUrl ?? ""),
  order: Number(d.order ?? 99),
});

export const toSettings = (d: DocumentData | undefined): Settings => ({
  deliveryCharge: Number(d?.deliveryCharge ?? DEFAULT_SETTINGS.deliveryCharge),
  freeDeliveryThreshold: Number(d?.freeDeliveryThreshold ?? DEFAULT_SETTINGS.freeDeliveryThreshold),
  whatsappNumber: String(d?.whatsappNumber ?? DEFAULT_SETTINGS.whatsappNumber),
  isOpen: d?.isOpen !== false,
});
