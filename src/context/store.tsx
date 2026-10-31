import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, SEED_CATEGORIES, SEED_MENU, type Category, type MenuItem, type Settings } from "../data/menu";
import { isFirebaseConfigured } from "../lib/firebase-config";
import { getDelivery } from "../lib/orders";
import { rupee } from "../lib/utils";

type Lines = Record<string, number>;
export type CategoryFilter = string | "all";

interface StoreValue {
  /* Live data (Firestore, or the bundled defaults until/unless it's available) */
  menu: MenuItem[];
  categories: Category[];
  settings: Settings;
  itemById: Record<string, MenuItem>;
  menuStatus: "loading" | "ready";
  /** "firestore" once the real menu has loaded; "seed" when showing the bundled defaults. */
  menuSource: "firestore" | "seed";

  /* Cart */
  lines: Lines;
  items: { item: MenuItem; qty: number }[];
  count: number;
  subtotal: number;
  delivery: ReturnType<typeof getDelivery>;
  grandTotal: number;
  add: (id: string, opts?: { qty?: number; silent?: boolean }) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;

  /* UI */
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  menuCategory: CategoryFilter;
  setMenuCategory: (id: CategoryFilter) => void;
  query: string;
  setQuery: (q: string) => void;
  scrollTo: (id: string, offset?: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);
const CART_KEY = "techies-taste:cart";
/** If Firestore hasn't answered by then, show the bundled menu instead of skeletons. */
const MENU_TIMEOUT_MS = 6000;

function loadCart(): Lines {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? "{}") as Lines;
    return Object.fromEntries(Object.entries(parsed).filter(([, qty]) => Number.isInteger(qty) && qty > 0));
  } catch {
    return {};
  }
}

/** `locked` freezes page scroll from outside, e.g. while the splash screen is up. */
export function StoreProvider({ children, locked = false }: { children: ReactNode; locked?: boolean }) {
  const [lines, setLines] = useState<Lines>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const lenis = useLenis();

  const [liveMenu, setLiveMenu] = useState<MenuItem[] | null>(null);
  const [liveCategories, setLiveCategories] = useState<Category[] | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [menuStatus, setMenuStatus] = useState<"loading" | "ready">(isFirebaseConfigured ? "loading" : "ready");

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const timeout = setTimeout(() => setMenuStatus("ready"), MENU_TIMEOUT_MS);
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const onError = (err: unknown) => {
      console.error("Firestore:", err);
      setMenuStatus("ready");
    };
    // Loaded on demand (while the splash screen is up) to keep the first bundle small.
    import("../lib/menu-api")
      .then(({ subscribePublicData }) => {
        if (cancelled) return;
        unsubscribe = subscribePublicData({
          onMenu: (items) => {
            // An empty collection means the owner hasn't imported the menu yet: keep the defaults.
            setLiveMenu(items.length ? items : null);
            setMenuStatus("ready");
          },
          onCategories: (cats) => setLiveCategories(cats.length ? cats : null),
          onSettings: (s) => setSettings(s),
          onError,
        });
      })
      .catch(onError);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  const menu = liveMenu ?? SEED_MENU;
  const categories = useMemo(() => {
    const cats = liveCategories ?? SEED_CATEGORIES;
    // Keep only categories that exist, in admin-defined order.
    return [...cats].sort((a, b) => a.order - b.order);
  }, [liveCategories]);
  const itemById = useMemo(() => Object.fromEntries(menu.map((i) => [i.id, i])), [menu]);
  const itemByIdRef = useRef(itemById);
  itemByIdRef.current = itemById;

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable: cart just won't persist */
    }
  }, [lines]);

  // Drop cart lines for dishes that no longer exist, once the real menu is in.
  useEffect(() => {
    if (!liveMenu) return;
    setLines((prev) => {
      const kept = Object.fromEntries(Object.entries(prev).filter(([id]) => itemById[id]));
      return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
    });
  }, [liveMenu, itemById]);

  // Freeze page scroll while an overlay is open.
  const frozen = cartOpen || paletteOpen || filtersOpen || locked;
  useEffect(() => {
    if (frozen) lenis?.stop();
    else lenis?.start();
    document.documentElement.style.overflow = frozen ? "hidden" : "";
  }, [frozen, lenis]);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 20);
      return next;
    });
  }, []);

  const add = useCallback<StoreValue["add"]>((id, opts = {}) => {
    const qty = opts.qty ?? 1;
    const item = itemByIdRef.current[id];
    if (!item) return;
    if (!item.isAvailable) {
      toast.error(`${item.name} is out of stock right now`);
      return;
    }
    setLines((prev) => ({ ...prev, [id]: Math.min((prev[id] ?? 0) + qty, 20) }));
    if (!opts.silent) {
      toast(`${item.name} added`, {
        description: `${qty > 1 ? `${qty} × ` : ""}${rupee(item.price)}`,
        action: { label: "View cart", onClick: () => setCartOpen(true) },
        cancel: {
          label: "Undo",
          onClick: () =>
            setLines((prev) => {
              const next = { ...prev };
              const left = (next[id] ?? 0) - qty;
              if (left <= 0) delete next[id];
              else next[id] = left;
              return next;
            }),
        },
      });
    }
  }, []);

  const clear = useCallback(() => setLines({}), []);

  // Opening the cart supersedes any "added" toasts (they'd cover its footer on phones).
  const openCart = useCallback((open: boolean) => {
    if (open) toast.dismiss();
    setCartOpen(open);
  }, []);

  const scrollTo = useCallback(
    (id: string, offset = -96) => {
      const target = id === "top" ? 0 : document.getElementById(id);
      if (target === null) return;
      if (lenis) lenis.scrollTo(target, { offset: id === "top" ? 0 : offset, duration: 1.2 });
      else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
    },
    [lenis],
  );

  const value = useMemo<StoreValue>(() => {
    const items = Object.entries(lines)
      .filter(([id]) => itemById[id])
      .map(([id, qty]) => ({ item: itemById[id], qty }));
    const subtotal = items.reduce((sum, l) => sum + l.qty * l.item.price, 0);
    const delivery = getDelivery(subtotal, settings);
    return {
      menu,
      categories,
      settings,
      itemById,
      menuStatus,
      menuSource: liveMenu ? "firestore" : "seed",
      lines,
      items,
      count: items.reduce((sum, l) => sum + l.qty, 0),
      subtotal,
      delivery,
      grandTotal: subtotal + delivery.charge,
      add,
      setQty,
      clear,
      cartOpen,
      setCartOpen: openCart,
      paletteOpen,
      setPaletteOpen,
      filtersOpen,
      setFiltersOpen,
      menuCategory,
      setMenuCategory,
      query,
      setQuery,
      scrollTo,
    };
  }, [menu, categories, settings, itemById, menuStatus, liveMenu, lines, add, setQty, clear, openCart, cartOpen, paletteOpen, filtersOpen, menuCategory, query, scrollTo]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
