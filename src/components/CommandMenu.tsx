import { useEffect } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Dices, Search, ShoppingBag, Wallet, UtensilsCrossed } from "lucide-react";
import { useStore } from "../context/store";
import { rupee } from "../lib/utils";
import { FoodImage, VegMark } from "./ui/primitives";

/**
 * cmdk's default fuzzy scoring lets "momo" match "Manchurian Chowmein · Fast Food".
 * Match whole-word prefixes instead, ranking dish names above category keywords.
 */
function wordFilter(value: string, search: string, keywords: string[] = []) {
  const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const [name = value, ...rest] = keywords.length ? keywords : [value];
  const nameWords = name.toLowerCase().split(/[\s()]+/);
  const allWords = [...nameWords, ...rest.join(" ").toLowerCase().split(/\s+/)];
  if (!terms.every((t) => allWords.some((w) => w.startsWith(t)))) return 0;
  return terms.every((t) => nameWords.some((w) => w.startsWith(t))) ? 1 : 0.5;
}

export function CommandMenu() {
  const { paletteOpen, setPaletteOpen, setCartOpen, add, scrollTo, lines, menu, categories } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      } else if (e.key === "/" && !typing && !paletteOpen) {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  const run = (fn: () => void) => {
    setPaletteOpen(false);
    fn();
  };

  const available = menu.filter((i) => i.isAvailable);
  const actions = [
    { label: "Open my cart", icon: ShoppingBag, onSelect: () => run(() => setCartOpen(true)) },
    { label: "Plan a meal for my budget", icon: Wallet, onSelect: () => run(() => scrollTo("planner")) },
    { label: "Browse the full menu", icon: UtensilsCrossed, onSelect: () => run(() => scrollTo("menu")) },
    { label: "Surprise me", icon: Dices, onSelect: () => run(() => available.length && add(available[Math.floor(Math.random() * available.length)].id)) },
  ];

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => setPaletteOpen(false)}
        >
          <motion.div
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-edge/10 bg-ink-900 shadow-2xl shadow-black/60 light:shadow-black/20"
            role="dialog"
            aria-modal="true"
            aria-label="Search the menu"
          >
            <Command label="Search the menu" loop filter={wordFilter}>
              <div className="flex items-center gap-3 border-b border-edge/10 px-5">
                <Search className="size-5 text-cream/40" />
                <Command.Input autoFocus placeholder="Search momos, rolls, paneer…" className="h-16 flex-1 bg-transparent text-base outline-none placeholder:text-cream/35" />
                <kbd className="rounded-md border border-edge/15 px-1.5 py-0.5 font-mono text-[10px] text-cream/50">ESC</kbd>
              </div>

              <Command.List data-lenis-prevent className="max-h-[min(58vh,440px)] overflow-y-auto overscroll-contain p-2">
                <Command.Empty className="px-4 py-12 text-center text-sm text-cream/50">No dish found. Try “momos” or “paneer”.</Command.Empty>

                <Command.Group heading="Quick actions">
                  {actions.map(({ label, icon: Icon, onSelect }) => (
                    <Command.Item key={label} value={label} onSelect={onSelect} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm">
                      <Icon className="size-4 text-accent" />
                      {label}
                      <CornerDownLeft className="cmdk-enter ml-auto size-4 text-cream/40 opacity-0" />
                    </Command.Item>
                  ))}
                </Command.Group>

                {categories.map((c) => (
                  <Command.Group key={c.id} heading={c.name}>
                    {menu
                      .filter((item) => item.category === c.id)
                      .map((item) => (
                        <Command.Item
                          key={item.id}
                          value={item.id}
                          keywords={[item.name, c.name, String(item.price), item.isVeg ? "veg" : "non-veg egg"]}
                          onSelect={() => add(item.id)}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
                          disabled={!item.isAvailable}
                        >
                          <FoodImage src={item.imageUrl} alt={item.name} category={item.category} className="size-10 shrink-0 rounded-lg" />
                          <VegMark veg={item.isVeg} />
                          <span className="flex-1 font-medium">{item.name}</span>
                          {!item.isAvailable ? (
                            <span className="font-mono text-[11px] text-cream/40 uppercase">sold out</span>
                          ) : lines[item.id] ? (
                            <span className="rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[11px] text-accent">×{lines[item.id]}</span>
                          ) : null}
                          <span className="font-display font-bold text-accent">{rupee(item.price)}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="flex items-center gap-4 border-t border-edge/10 px-5 py-3 font-mono text-[11px] text-cream/40">
                <span>↑↓ navigate</span>
                <span>↵ add to cart</span>
                <span className="ml-auto">esc close</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
