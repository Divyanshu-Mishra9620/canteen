import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CookingPot,
  Croissant,
  Egg,
  Hamburger,
  ScrollText,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const rupee = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/** Deterministic PRNG so the same seed always yields the same combo. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatHour(hour: number) {
  const h = hour % 12 || 12;
  return `${h}:00 ${hour < 12 || hour === 24 ? "AM" : "PM"}`;
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "fast-food": Hamburger,
  momos: CookingPot,
  rolls: ScrollText,
  egg: Egg,
  paranthas: Wheat,
  patties: Croissant,
};

/** Icon for a category; categories added from the admin panel get a generic one. */
export const categoryIcon = (id: string) => CATEGORY_ICON[id] ?? UtensilsCrossed;
