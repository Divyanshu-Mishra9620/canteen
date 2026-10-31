import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { LayoutGrid, SlidersHorizontal, X } from "lucide-react";
import { useStore, type CategoryFilter } from "../context/store";
import { categoryIcon, cn } from "../lib/utils";
import type { MenuItem } from "../data/menu";
import { SITE } from "../data/site";
import { Eyebrow, RevealText } from "./ui/primitives";
import { MenuCard, MenuCardSkeleton } from "./menu/MenuCard";
import { FilterSheet } from "./menu/FilterSheet";
import { DEFAULT_FILTERS, SORT_LABEL, activeFilterCount, applyFilters, type Filters } from "./menu/filters";

interface Group {
  id: string;
  name: string;
  tagline: string;
  items: MenuItem[];
}

function Grid({ items }: { items: MenuItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, i) => (
          <MenuCard key={item.id} item={item} index={i} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function MenuSection() {
  const { menu, categories, menuStatus, menuCategory, setMenuCategory, query, setQuery, setFiltersOpen, scrollTo } = useStore();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // A 1px sentinel above the chip bar tells us when the bar is pinned under the header.
  // (Measured on scroll rather than with IntersectionObserver, which misses big jumps past it.)
  const { scrollY } = useScroll();
  const measureStuck = () => setStuck((sentinel.current?.getBoundingClientRect().top ?? 1) < 90);
  useMotionValueEvent(scrollY, "change", measureStuck);
  useEffect(measureStuck, []);

  const results = useMemo(() => applyFilters(menu, filters, query, categories), [menu, filters, query, categories]);
  const inCategory = menuCategory === "all" || query ? results : results.filter((i) => i.category === menuCategory);
  const filterCount = activeFilterCount(filters);

  // Grouped by category (menu order) unless the user is searching or has picked a custom sort.
  const grouped = !query && filters.sort === "default";
  const groups = useMemo<Group[]>(() => {
    if (!grouped) return [];
    const known = new Set(categories.map((c) => c.id));
    const list: Group[] = categories
      .filter((c) => menuCategory === "all" || c.id === menuCategory)
      .map((c) => ({ id: c.id, name: c.name, tagline: c.tagline, items: inCategory.filter((i) => i.category === c.id) }));
    const orphans = menuCategory === "all" ? inCategory.filter((i) => !known.has(i.category)) : [];
    if (orphans.length) list.push({ id: "other", name: "More", tagline: "", items: orphans });
    return list.filter((g) => g.items.length > 0);
  }, [grouped, categories, inCategory, menuCategory]);

  const pickCategory = (id: CategoryFilter, chip: HTMLElement) => {
    setMenuCategory(id);
    if (query) setQuery("");
    chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    // If the user is already down in the list, bring its top back under the sticky bar.
    if ((listRef.current?.getBoundingClientRect().top ?? 0) < 150) scrollTo("menu-list", -150);
  };

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery("");
    setMenuCategory("all");
  };

  const chips: { id: CategoryFilter; name: string; count: number }[] = [
    { id: "all", name: "All", count: menu.length },
    ...categories.map((c) => ({ id: c.id, name: c.name, count: menu.filter((i) => i.category === c.id).length })),
  ];

  const activePills = [
    query && { key: "q", label: `“${query}”`, clear: () => setQuery("") },
    filters.diet !== "all" && { key: "diet", label: filters.diet === "veg" ? "Veg" : "Non-Veg", clear: () => setFilters({ ...filters, diet: "all" }) },
    filters.sort !== "default" && { key: "sort", label: SORT_LABEL[filters.sort], clear: () => setFilters({ ...filters, sort: "default" }) },
    filters.recommended && { key: "rec", label: "Recommended", clear: () => setFilters({ ...filters, recommended: false }) },
    filters.maxPrice > 0 && { key: "max", label: `₹${filters.maxPrice} & under`, clear: () => setFilters({ ...filters, maxPrice: 0 }) },
    filters.availableOnly && { key: "avail", label: "Available now", clear: () => setFilters({ ...filters, availableOnly: false }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <section id="menu" className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>menu.json</Eyebrow>
            <h2 className="mt-4 font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <RevealText text="The full menu." highlight={["menu."]} />
            </h2>
          </div>
          <p className="max-w-sm text-cream/55">
            Every price straight from the counter board. We deliver to hostels within {SITE.deliveryRadiusM} m of the canteen, free on orders over ₹200.
          </p>
        </div>

        {/* Sticky category chips + filters, pinned just under the header */}
        <div ref={sentinel} className="mt-8 h-px" aria-hidden />
        <div
          className={cn(
            "sticky top-[76px] z-30 -mx-4 border-b border-edge/10 bg-ink-950/85 px-4 py-3 backdrop-blur-xl sm:top-[84px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
            // While pinned, also cover the strip above the bar so dishes don't peek around the floating header.
            "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-24 before:bg-ink-950/85 before:backdrop-blur-xl before:transition-opacity before:duration-300",
            stuck ? "before:opacity-100" : "before:opacity-0",
          )}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={cn(
                "relative flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                filterCount ? "border-brand bg-brand/10 text-cream" : "border-edge/15 text-cream/75 hover:border-edge/30",
              )}
              aria-label={`Filters and sort${filterCount ? `, ${filterCount} active` : ""}`}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filters</span>
              {filterCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] text-coal tabular-nums">{filterCount}</span>
              )}
            </button>
            <span className="h-6 w-px shrink-0 bg-edge/10" />
            <div role="tablist" aria-label="Menu categories" className="no-scrollbar -mr-4 flex flex-1 gap-1.5 overflow-x-auto pr-4 sm:mr-0 sm:pr-0">
              {chips.map((c) => {
                const active = c.id === menuCategory && !query;
                const Icon = c.id === "all" ? LayoutGrid : categoryIcon(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(e) => pickCategory(c.id, e.currentTarget)}
                    className={cn(
                      "relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                      active ? "text-coal" : "bg-edge/[0.04] text-cream/65 hover:text-cream",
                    )}
                  >
                    {active && (
                      <motion.span layoutId="menu-chip" className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                    )}
                    <Icon className="relative size-4" />
                    <span className="relative">{c.name}</span>
                    <span className={cn("relative font-mono text-[11px]", active ? "text-coal/60" : "text-cream/35")}>{c.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {activePills.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pt-2.5">
                  {activePills.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={p.clear}
                      className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand/15 pr-2 pl-3 text-xs font-semibold text-accent"
                    >
                      {p.label} <X className="size-3.5" />
                    </button>
                  ))}
                  <button type="button" onClick={clearAll} className="h-8 shrink-0 px-2 text-xs font-semibold text-cream/55 underline-offset-4 hover:underline">
                    Clear all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div id="menu-list" ref={listRef} className="mt-8 scroll-mt-40">
          {menuStatus === "loading" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading menu">
              {Array.from({ length: 6 }, (_, i) => (
                <MenuCardSkeleton key={i} />
              ))}
            </div>
          ) : inCategory.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-dashed border-edge/15 px-6 py-14 text-center">
              <p className="font-display text-2xl font-bold">No dishes match that.</p>
              <p className="mt-2 text-cream/55">
                {query ? `Nothing on the menu matches “${query}”.` : "Try loosening a filter or two."}
              </p>
              <button type="button" onClick={clearAll} className="mt-6 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-coal">
                Clear search & filters
              </button>
            </motion.div>
          ) : grouped ? (
            <div className="space-y-14">
              {groups.map((g) => (
                <div key={g.id} id={`cat-${g.id}`} className="scroll-mt-40">
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{g.name}</h3>
                      {g.tagline && (
                        <p className={cn("mt-1", g.id === "egg" ? "-rotate-2 font-script text-2xl text-accent" : "text-sm text-cream/55")}>{g.tagline}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-cream/40">
                      {g.items.length} {g.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <Grid items={g.items} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mb-5 font-mono text-xs text-cream/50">
                {inCategory.length} {inCategory.length === 1 ? "dish" : "dishes"}
                {query && ` for “${query}”`} · {SORT_LABEL[filters.sort]}
              </p>
              <Grid items={inCategory} />
            </>
          )}
        </div>
      </div>

      <FilterSheet filters={filters} setFilters={setFilters} resultCount={inCategory.length} />
    </section>
  );
}
