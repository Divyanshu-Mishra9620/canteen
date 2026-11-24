import { SITE } from "../data/site";
import { distanceM } from "../../shared/rules";

/** Fixes worse than this can't tell "inside" from "outside" the radius; ask for precise location. */
const MAX_ACCURACY_M = 200;
/** A fix older than this is re-taken before placing the order. */
export const LOCATION_MAX_AGE_MS = 2 * 60_000;

export interface CustomerLocation {
  lat: number;
  lng: number;
  /** Metres (GPS uncertainty radius). */
  accuracy: number;
  /** Metres from the canteen. */
  distance: number;
}

export type LocationCheck =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; location: CustomerLocation; at: number }
  | { status: "far"; distance: number }
  | { status: "imprecise"; accuracy: number }
  | { status: "denied" }
  | { status: "unavailable"; reason: "unsupported" | "insecure" | "timeout" | "error" };

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

/** Decides whether a GPS fix is inside the delivery radius, taking its accuracy into account. */
export function judgeFix(lat: number, lng: number, accuracy: number, at = Date.now()): LocationCheck {
  const { lat: cLat, lng: cLng } = SITE.location;
  const radius = SITE.deliveryRadiusM;
  const distance = distanceM(lat, lng, cLat, cLng);
  const location = { lat: +lat.toFixed(6), lng: +lng.toFixed(6), accuracy: Math.round(accuracy), distance: Math.round(distance) };

  if (distance + accuracy <= radius) return { status: "ok", location, at }; // inside even in the worst case
  if (distance - accuracy > radius) return { status: "far", distance }; // outside even in the best case
  if (accuracy > MAX_ACCURACY_M) return { status: "imprecise", accuracy: Math.round(accuracy) };
  return distance <= radius ? { status: "ok", location, at } : { status: "far", distance };
}

/** Asks the browser for the customer's position (prompts for permission the first time). */
export function checkLocation(): Promise<LocationCheck> {
  if (!("geolocation" in navigator)) return Promise.resolve({ status: "unavailable", reason: "unsupported" });
  // Browsers only expose location on https:// (and localhost).
  if (!window.isSecureContext) return Promise.resolve({ status: "unavailable", reason: "insecure" });

  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(judgeFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.timestamp || Date.now())),
      (err) =>
        resolve(
          err.code === err.PERMISSION_DENIED
            ? { status: "denied" }
            : { status: "unavailable", reason: err.code === err.TIMEOUT ? "timeout" : "error" },
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    ),
  );
}

export const mapLinkFor = (loc: { lat: number; lng: number }) => `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
