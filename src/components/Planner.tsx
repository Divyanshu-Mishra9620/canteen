import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dices, Dumbbell, Leaf, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { MenuItem } from "../data/menu";
import { useStore } from "../context/store";
import { cn, mulberry32, rupee } from "../lib/utils";
import { AnimatedNumber, Button } from "./ui/primitives";

const MIN = 30;
const MAX = 300;
const TRIES = 24;
const PRESETS = [
  { value: 50, label: "Snack" },
  { value: 100, label: "Lunch" },
  { value: 200, label: "Treat" },
  { value: 300, label: "Squad" },
];

interface Plan {
  picks: MenuItem[];
  left: number;
}

/** Greedy pass over a seeded shuffle: one dish per category first, then fill what's left. */
function greedy(budget: number, pool: MenuItem[], seed: number, protein: boolean): Plan {
  const rand = mulberry32(seed);
  const shuffled = pool.map((item) => ({ item, r: rand() })).sort((a, b) => a.r - b.r).map((x) => x.item);
  const ordered = protein ? [...shuffled].sort((a, b) => Number(!!b.tags?.includes("protein")) - Number(!!a.tags?.includes("protein"))) : shuffled;

  const picks: MenuItem[] = [];
  const cats = new Set<string>();
  let left = budget;
  for (const item of ordered) {
    if (picks.length >= 5) break;
    if (item.price <= left && !cats.has(item.category)) {
      picks.push(item);
      cats.add(item.category);
      left -= item.price;
    }
  }
  for (const item of ordered) {
    if (picks.length >= 6) break;
    if (item.price <= left && !picks.includes(item)) {
      picks.push(item);
      left -= item.price;
    }
  }
  return { picks, left };
}

function planMeal(menu: MenuItem[], budget: number, vegOnly: boolean, protein: boolean, seed: number): Plan {
  const pool = menu.filter((i) => i.isAvailable && (!vegOnly || i.isVeg));
  let best: Plan = { picks: [], left: budget };
  for (let k = 0; k < TRIES; k++) {
    const plan = greedy(budget, pool, seed * 101 + k, protein);
    if (plan.left < best.left || (plan.left === best.left && plan.picks.length > best.picks.length) || best.picks.length === 0) best = plan;
  }
  return best;
}

function Toggle({ on, onClick, icon: Icon, children }: { on: boolean; onClick: () => void; icon: typeof Leaf; children: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
        on ? "border-ink-950 bg-ink-950 text-accent" : "border-ink-950/20 hover:border-ink-950/50",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

export function Planner() {
  const { add, setCartOpen, menu } = useStore();
  const [budget, setBudget] = useState(100);
  const [vegOnly, setVegOnly] = useState(false);
  const [protein, setProtein] = useState(false);
  const [seed, setSeed] = useState(7);

  const plan = useMemo(() => planMeal(menu, budget, vegOnly, protein, seed), [menu, budget, vegOnly, protein, seed]);
  const spent = budget - plan.left;
  const signature = plan.picks.map((p) => p.id).join("|");
  const fill = ((budget - MIN) / (MAX - MIN)) * 100;

  const addAll = () => {
    plan.picks.forEach((p) => add(p.id, { silent: true }));
    toast(`${plan.picks.length} dishes added to your cart`, {
      description: `Planned meal · ${rupee(spent)}`,
      action: { label: "View cart", onClick: () => setCartOpen(true) },
    });
  };

  return (
    // Always-dark tokens inside: the section sits on brand yellow in both themes.
    <section id="planner" className="theme-dark relative overflow-hidden bg-brand py-24 text-coal sm:py-32">
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="container-x relative grid items-center gap-16 lg:grid-cols-2">
        <div>
          <p className="font-mono text-sm font-medium">
            <span className="opacity-50">$</span> ./hungry --budget={budget}
            {vegOnly && " --veg"}
            {protein && " --protein"}
          </p>
          <h2 className="mt-5 font-display text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Got <AnimatedNumber value={budget} prefix="₹" />?
            <br />
            We'll plan the feast.
          </h2>
          <p className="mt-6 max-w-md text-lg text-coal/70">
            Slide to your budget. The Hungry Algorithm tries {TRIES} combos and keeps the one that leaves the fewest rupees on the table.
          </p>

          <div className="mt-10 rounded-[28px] border-2 border-ink-950/10 bg-paper/50 p-6 backdrop-blur sm:p-8">
            <div className="flex items-baseline justify-between">
              <label htmlFor="budget" className="text-sm font-semibold">
                Your budget
              </label>
              <span className="font-display text-4xl font-extrabold tabular-nums">{rupee(budget)}</span>
            </div>
            <input
              id="budget"
              type="range"
              min={MIN}
              max={MAX}
              step={10}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="range mt-5"
              style={{ "--fill": `${fill}%` } as React.CSSProperties}
            />
            <div className="mt-3 flex justify-between font-mono text-xs opacity-50">
              <span>{rupee(MIN)}</span>
              <span>{rupee(MAX)}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setBudget(p.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    budget === p.value ? "bg-ink-950 text-accent" : "bg-ink-950/[0.06] hover:bg-ink-950/15",
                  )}
                >
                  {p.label} · {rupee(p.value)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Toggle on={vegOnly} onClick={() => setVegOnly((v) => !v)} icon={Leaf}>
              Veg only
            </Toggle>
            <Toggle on={protein} onClick={() => setProtein((v) => !v)} icon={Dumbbell}>
              Protein power
            </Toggle>
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              className="group flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold underline-offset-4 hover:underline"
            >
              <motion.span key={seed} initial={{ rotate: -180 }} animate={{ rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                <Dices className="size-5" />
              </motion.span>
              Shuffle combo
            </button>
          </div>
        </div>

        <Receipt plan={plan} budget={budget} spent={spent} seed={seed} signature={signature} onAddAll={addAll} />
      </div>
    </section>
  );
}

function Receipt({
  plan,
  budget,
  spent,
  seed,
  signature,
  onAddAll,
}: {
  plan: Plan;
  budget: number;
  spent: number;
  seed: number;
  signature: string;
  onAddAll: () => void;
}) {
  const now = new Date();
  const orderNo = ((seed * 7919 + budget * 31) % 9000) + 1000;
  const bars = useMemo(() => {
    const rand = mulberry32(orderNo);
    return Array.from({ length: 46 }, () => 1 + Math.floor(rand() * 3));
  }, [orderNo]);

  return (
    <div className="mx-auto w-full max-w-md">
      <motion.div
        initial={{ rotate: 0, y: 40, opacity: 0 }}
        whileInView={{ rotate: 1.5, y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="drop-shadow-[0_30px_40px_rgba(0,0,0,0.3)]"
      >
        <div className="receipt-edge bg-paper px-7 pt-9 pb-14 font-mono text-[13px] text-coal sm:px-9">
          <div className="text-center">
            <p className="font-display text-2xl font-extrabold tracking-tight">TECHIE'S TASTE</p>
            <p className="mt-1 text-[11px] opacity-60">Good Food • Happy Vibes</p>
            <p className="mt-3 text-[11px] opacity-60">
              ORDER #{orderNo} · {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}{" "}
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="my-5 border-t-2 border-dashed border-ink-950/25" />

          <div className="min-h-[72px]">
            <AnimatePresence mode="wait">
              <motion.ul key={signature} className="space-y-2.5" initial="hidden" animate="show" exit="hidden" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
                {plan.picks.map((item) => (
                  <motion.li
                    key={item.id}
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    transition={{ duration: 0.3 }}
                    className="flex items-baseline gap-2"
                  >
                    <span className="opacity-50">1×</span>
                    <span className="font-semibold">{item.name}</span>
                    <span className="flex-1 translate-y-[-3px] border-b border-dotted border-ink-950/30" />
                    <span>{rupee(item.price)}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>

          <div className="my-5 border-t-2 border-dashed border-ink-950/25" />

          <dl className="space-y-1.5">
            <div className="flex justify-between opacity-60">
              <dt>Budget</dt>
              <dd>{rupee(budget)}</dd>
            </div>
            <div className="flex justify-between opacity-60">
              <dt>Change</dt>
              <dd>{rupee(plan.left)}</dd>
            </div>
            <div className="flex items-baseline justify-between pt-1 text-base font-bold">
              <dt>TOTAL</dt>
              <dd className="font-display text-3xl font-extrabold">
                <AnimatedNumber value={spent} prefix="₹" />
              </dd>
            </div>
          </dl>

          <div className="my-5 border-t-2 border-dashed border-ink-950/25" />

          <p className="text-center text-[11px] opacity-60">
            {plan.picks.length} dishes · {TRIES} combos evaluated
            <br />*** come hungry again ***
          </p>
          <div className="mt-5 flex h-12 items-stretch justify-center gap-[2px]" aria-hidden>
            {bars.map((w, i) => (
              <span key={i} className="bg-coal" style={{ width: w }} />
            ))}
          </div>
        </div>
      </motion.div>

      <Button variant="dark" size="lg" className="mt-8 w-full" onClick={onAddAll} disabled={plan.picks.length === 0}>
        <ShoppingBag className="size-5 text-brand" />
        Add all to cart · {rupee(spent)}
      </Button>
    </div>
  );
}
