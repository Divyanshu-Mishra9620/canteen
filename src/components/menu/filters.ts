import type { Category, MenuItem } from "../../data/menu";

export type Diet = "all" | "veg" | "nonveg";
export type Sort = "default" | "price-asc" | "price-desc" | "prep" | "popular";

export interface Filters {
  diet: Diet;
  sort: Sort;
  recommended: boolean;
  /** 0 = no price cap. */
  maxPrice: 0 | 50 | 100;
  availableOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = { diet: "all", sort: "default", recommended: false, maxPrice: 0, availableOnly: false };

export const SORT_LABEL: Record<Sort, string> = {
  default: "Menu order",
  "price-asc": "Price: Low → High",
  "price-desc": "Price: High → Low",
  prep: "Prep time: Fastest first",
  popular: "Popular: Most ordered",
};

export const activeFilterCount = (f: Filters) =>
  Number(f.diet !== "all") + Number(f.sort !== "default") + Number(f.recommended) + Number(f.maxPrice > 0) + Number(f.availableOnly);

const byMenuOrder = (a: MenuItem, b: MenuItem) =>
  (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);

/** Applies search, filters and sort. Search matches dish names and category names. */
export function applyFilters(items: MenuItem[], f: Filters, query: string, categories: Category[]) {
  const q = query.trim().toLowerCase();
  const categoryName = Object.fromEntries(categories.map((c) => [c.id, c.name.toLowerCase()]));

  const list = items.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q) && !(categoryName[i.category] ?? "").includes(q)) return false;
    if (f.diet === "veg" && !i.isVeg) return false;
    if (f.diet === "nonveg" && i.isVeg) return false;
    if (f.recommended && !i.isRecommended) return false;
    if (f.maxPrice && i.price > f.maxPrice) return false;
    if (f.availableOnly && !i.isAvailable) return false;
    return true;
  });

  const compare: Record<Sort, (a: MenuItem, b: MenuItem) => number> = {
    default: byMenuOrder,
    "price-asc": (a, b) => a.price - b.price || byMenuOrder(a, b),
    "price-desc": (a, b) => b.price - a.price || byMenuOrder(a, b),
    prep: (a, b) => a.prepTime - b.prepTime || byMenuOrder(a, b),
    popular: (a, b) => b.orderCount - a.orderCount || byMenuOrder(a, b),
  };
  return list.sort(compare[f.sort]);
}
