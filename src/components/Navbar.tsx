import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowLeft, ChefHat, Menu as MenuIcon, Search, ShoppingBag, X } from "lucide-react";
import { useStore } from "../context/store";
import { ThemeToggle } from "../context/theme";
import { cn } from "../lib/utils";

const LINKS = [
  { id: "menu", label: "Menu" },
  { id: "signature", label: "Picks" },
  { id: "planner", label: "Budget" },
  { id: "visit", label: "Visit" },
];

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center", compact ? "gap-2 sm:gap-2.5" : "gap-2.5", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-brand text-coal shadow-[0_0_24px_-4px] shadow-brand/60",
          compact ? "size-8 sm:size-9" : "size-9",
        )}
      >
        <ChefHat className="size-5" strokeWidth={2.2} />
      </span>
      <span className={cn("truncate font-display leading-none font-bold tracking-tight whitespace-nowrap", compact ? "text-[15px] sm:text-lg" : "text-lg")}>
        Techie's <span className="text-accent">Taste</span>
      </span>
    </span>
  );
}

/** Live search bound to the menu. Typing jumps to the menu so results are visible. */
function SearchField({ autoFocus, className, onEscape }: { autoFocus?: boolean; className?: string; onEscape?: () => void }) {
  const { query, setQuery, setMenuCategory, scrollTo } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <label className={cn("relative flex h-10 items-center gap-2 rounded-full border border-edge/10 bg-edge/[0.04] pr-1.5 pl-3 transition focus-within:border-brand/60", className)}>
      <Search className="size-4 shrink-0 text-cream/45" />
      <span className="sr-only">Search dishes or categories</span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Search momos, rolls…"
        enterKeyHint="search"
        onChange={(e) => {
          const next = e.target.value;
          if (next && !query) {
            setMenuCategory("all");
            scrollTo("menu-list", -150);
          }
          setQuery(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            onEscape?.();
          }
          if (e.key === "Enter") scrollTo("menu-list", -150);
        }}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-cream/35 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-7 shrink-0 place-items-center rounded-full text-cream/50 hover:bg-edge/10 hover:text-cream">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

export function Navbar() {
  const { count, setCartOpen, scrollTo } = useStore();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 24));

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    setMobileOpen(false);
    scrollTo(id);
  };

  const pillTarget = hovered ?? active;

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-50 px-2 sm:top-4 sm:px-6">
        <nav
          className={cn(
            "mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border pr-1.5 pl-2.5 transition-[background-color,border-color,box-shadow] duration-500 sm:pr-2 sm:pl-4",
            scrolled || mobileOpen || mobileSearch
              ? "border-edge/10 bg-ink-900/80 shadow-2xl shadow-black/40 backdrop-blur-xl light:shadow-black/10"
              : "border-transparent bg-transparent",
          )}
          aria-label="Main"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {mobileSearch ? (
              <motion.div
                key="search"
                className="flex flex-1 items-center gap-1.5"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
              >
                <button type="button" onClick={() => setMobileSearch(false)} aria-label="Close search" className="grid size-10 shrink-0 place-items-center rounded-full text-cream/70">
                  <ArrowLeft className="size-5" />
                </button>
                <SearchField autoFocus className="flex-1" onEscape={() => setMobileSearch(false)} />
              </motion.div>
            ) : (
              <motion.div key="bar" className="flex min-w-0 flex-1 items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button type="button" onClick={() => go("top")} aria-label="Back to top" className="min-w-0">
                  <Logo compact />
                </button>

                <ul className="ml-2 hidden items-center lg:flex" onMouseLeave={() => setHovered(null)}>
                  {LINKS.map((link) => (
                    <li key={link.id} className="relative">
                      <button
                        type="button"
                        onMouseEnter={() => setHovered(link.id)}
                        onClick={() => go(link.id)}
                        className={cn(
                          "relative z-10 px-3.5 py-2 text-sm font-medium transition-colors",
                          pillTarget === link.id ? "text-coal" : "text-cream/70 hover:text-cream",
                        )}
                      >
                        {link.label}
                      </button>
                      {pillTarget === link.id && (
                        <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                      )}
                    </li>
                  ))}
                </ul>

                <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
                  <SearchField className="hidden w-48 md:flex lg:w-56" />
                  <button
                    type="button"
                    onClick={() => setMobileSearch(true)}
                    className="grid size-9 place-items-center rounded-full border border-edge/10 bg-edge/[0.04] text-cream/70 sm:size-10 md:hidden"
                    aria-label="Search the menu"
                  >
                    <Search className="size-4" />
                  </button>
                  <ThemeToggle className="hidden sm:grid" />

                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="relative flex h-9 items-center gap-1.5 rounded-full bg-brand px-3 text-sm font-semibold text-coal transition hover:bg-brand-300 sm:h-10 sm:gap-2 sm:px-4"
                    aria-label={`Open cart, ${count} items`}
                  >
                    <ShoppingBag className="size-4" strokeWidth={2.4} />
                    <span className="hidden sm:inline">Cart</span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={count}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 20 }}
                        className="grid h-5 min-w-5 place-items-center rounded-full bg-coal px-1 text-[11px] text-brand tabular-nums"
                      >
                        {count}
                      </motion.span>
                    </AnimatePresence>
                  </button>

                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-full text-cream sm:size-10 lg:hidden"
                    onClick={() => setMobileOpen((o) => !o)}
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    aria-expanded={mobileOpen}
                  >
                    {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-ink-950/95 px-6 pb-12 backdrop-blur-xl lg:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 40px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul className="space-y-1">
              {LINKS.map((link, i) => (
                <li key={link.id} className="overflow-hidden">
                  <motion.button
                    type="button"
                    onClick={() => go(link.id)}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex w-full items-baseline gap-4 py-1 text-left font-display text-5xl font-bold"
                  >
                    <span className="font-mono text-sm text-accent">0{i + 1}</span>
                    {link.label}
                  </motion.button>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex items-center justify-between">
              <p className="font-script text-2xl text-accent">Eat • Relax • Repeat</p>
              <span className="flex items-center gap-3 text-sm text-cream/60">
                Theme <ThemeToggle />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
