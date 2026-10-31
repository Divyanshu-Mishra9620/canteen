import { useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Check, Star, X } from "lucide-react";
import { useStore } from "../../context/store";
import { useMediaQuery } from "../../hooks";
import { cn } from "../../lib/utils";
import { Button } from "../ui/primitives";
import { DEFAULT_FILTERS, SORT_LABEL, activeFilterCount, type Diet, type Filters, type Sort } from "./filters";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-2">
      <h3 className="mb-3 font-mono text-[11px] tracking-widest text-cream/45 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
        on ? "border-brand bg-brand text-coal" : "border-edge/15 text-cream/75 hover:border-edge/30",
      )}
    >
      {children}
    </button>
  );
}

/** Filters & sort: a draggable bottom sheet on phones, a centred dialog from md up. */
export function FilterSheet({
  filters,
  setFilters,
  resultCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  resultCount: number;
}) {
  const { filtersOpen, setFiltersOpen } = useStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const dragControls = useDragControls();
  const close = () => setFiltersOpen(false);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters({ ...filters, [key]: value });

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFiltersOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen, setFiltersOpen]);

  const diets: { value: Diet; label: string; dot?: string }[] = [
    { value: "all", label: "All" },
    { value: "veg", label: "Veg", dot: "bg-veg" },
    { value: "nonveg", label: "Non-Veg", dot: "bg-nonveg" },
  ];

  return (
    <AnimatePresence>
      {filtersOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <div className="pointer-events-none fixed inset-0 z-[71] flex items-end justify-center md:items-center md:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="filters-title"
              className="pointer-events-auto flex max-h-[88svh] w-full flex-col rounded-t-[28px] border border-edge/10 bg-ink-900 shadow-2xl md:max-w-lg md:rounded-[28px]"
              initial={isDesktop ? { opacity: 0, scale: 0.95, y: 12 } : { y: "100%" }}
              animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
              exit={isDesktop ? { opacity: 0, scale: 0.95, y: 12 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              drag={isDesktop ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 600) close();
              }}
            >
              {/* Drag handle (phones) */}
              <div onPointerDown={(e) => dragControls.start(e)} className="flex cursor-grab touch-none justify-center pt-3 pb-1 md:hidden">
                <span className="h-1.5 w-12 rounded-full bg-edge/20" />
              </div>

              <header className="flex items-center justify-between px-6 pt-2 pb-3 md:pt-6">
                <h2 id="filters-title" className="font-display text-2xl font-bold">
                  Filters & sort
                </h2>
                <button type="button" onClick={close} aria-label="Close filters" className="grid size-10 place-items-center rounded-full border border-edge/10 hover:border-edge/30">
                  <X className="size-5" />
                </button>
              </header>

              <div data-lenis-prevent className="flex-1 divide-y divide-edge/10 overflow-y-auto overscroll-contain px-6">
                <Section title="Diet">
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-edge/[0.05] p-1.5" role="radiogroup" aria-label="Diet">
                    {diets.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        role="radio"
                        aria-checked={filters.diet === d.value}
                        onClick={() => set("diet", d.value)}
                        className={cn(
                          "relative flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                          filters.diet === d.value ? "text-coal" : "text-cream/65",
                        )}
                      >
                        {filters.diet === d.value && (
                          <motion.span layoutId="diet-pill" className="absolute inset-0 rounded-xl bg-brand" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
                        )}
                        {d.dot && <span className={cn("relative size-2.5 rounded-full", d.dot)} />}
                        <span className="relative">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Sort by">
                  <div className="space-y-1" role="radiogroup" aria-label="Sort by">
                    {(Object.keys(SORT_LABEL) as Sort[]).map((value) => {
                      const on = filters.sort === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set("sort", value)}
                          className={cn("flex h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[15px] transition-colors", on ? "bg-brand/10 font-semibold" : "hover:bg-edge/[0.04]")}
                        >
                          {SORT_LABEL[value]}
                          <span className={cn("grid size-5 place-items-center rounded-full border-2", on ? "border-brand bg-brand text-coal" : "border-edge/25")}>
                            {on && <Check className="size-3" strokeWidth={3.5} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Quick filters">
                  <div className="flex flex-wrap gap-2">
                    <Chip on={filters.recommended} onClick={() => set("recommended", !filters.recommended)}>
                      <Star className="size-4" /> Top recommended
                    </Chip>
                    <Chip on={filters.maxPrice === 50} onClick={() => set("maxPrice", filters.maxPrice === 50 ? 0 : 50)}>
                      ₹50 & under
                    </Chip>
                    <Chip on={filters.maxPrice === 100} onClick={() => set("maxPrice", filters.maxPrice === 100 ? 0 : 100)}>
                      ₹100 & under
                    </Chip>
                    <Chip on={filters.availableOnly} onClick={() => set("availableOnly", !filters.availableOnly)}>
                      Available now only
                    </Chip>
                    <Chip on={filters.sort === "popular"} onClick={() => set("sort", filters.sort === "popular" ? "default" : "popular")}>
                      Popular
                    </Chip>
                  </div>
                </Section>
              </div>

              <footer className="flex items-center gap-3 border-t border-edge/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button variant="ghost" className="flex-1" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={activeFilterCount(filters) === 0}>
                  Clear all
                </Button>
                <Button className="flex-[1.4]" onClick={close}>
                  Show {resultCount} {resultCount === 1 ? "dish" : "dishes"}
                </Button>
              </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
