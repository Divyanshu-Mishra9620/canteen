/**
 * Business rules shared by the website (for instant feedback) and the API server
 * (which is the one that actually enforces them). Pure functions only: no browser or Node APIs.
 */
import type { Settings } from "../src/data/menu.js";
import { HOSTELS, SITE } from "../src/data/site.js";

/** Delivery rule: below the threshold costs `deliveryCharge`, at/above it is free. */
export function getDelivery(subtotal: number, settings: Pick<Settings, "deliveryCharge" | "freeDeliveryThreshold">) {
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

export const isKnownHostel = (hostel: string) => (HOSTELS as readonly string[]).includes(hostel);

/** Great-circle distance in metres. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLng = (lng2 - lng1) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
}

/** Metres from the canteen. */
export const distanceFromCanteen = (lat: number, lng: number) => distanceM(lat, lng, SITE.location.lat, SITE.location.lng);

/**
 * The server allows a little slack beyond the radius: the browser already rounds the fix and
 * already accounts for GPS accuracy, so this only absorbs rounding.
 */
export const RADIUS_SLACK_M = 20;
export const isWithinDeliveryRadius = (lat: number, lng: number) => distanceFromCanteen(lat, lng) <= SITE.deliveryRadiusM + RADIUS_SLACK_M;

export const MAX_QTY_PER_ITEM = 20;
export const MAX_DISTINCT_ITEMS = 40;
