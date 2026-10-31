import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Leaf, LoaderCircle, ShoppingBag } from "lucide-react";
import { useStore } from "../context/store";
import { cn, rupee } from "../lib/utils";
import { WhatsAppIcon } from "./ui/icons";
import { AnimatedNumber, Eyebrow, Reveal, RevealText, trackSpotlight } from "./ui/primitives";

const PIPELINE = [
  { cmd: "order.received()", detail: "Kurkure Momos × 2" },
  { cmd: "wok.heat()", detail: "high flame" },
  { cmd: "chef.plate()", detail: "+ red chutney" },
  { cmd: "deploy --to=room", detail: "served hot" },
];

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      onMouseMove={trackSpotlight}
      className={cn("spotlight overflow-hidden rounded-[28px] border border-edge/10 bg-ink-900 p-7 transition-colors hover:border-edge/20", className)}
    >
      {children}
    </div>
  );
}

/** Looping CI-style pipeline: each stage ticks to done, then the run restarts. */
function Pipeline() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % (PIPELINE.length + 2)), step >= PIPELINE.length ? 2200 : 1100);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="mt-6 space-y-2 rounded-2xl border border-edge/10 bg-ink-950 p-4 font-mono text-[13px]">
      {PIPELINE.map((stage, i) => {
        const state = i < step ? "done" : i === step ? "running" : "queued";
        return (
          <div key={stage.cmd} className={cn("flex items-center gap-3 transition-opacity duration-300", state === "queued" && "opacity-35")}>
            <span className="grid size-5 shrink-0 place-items-center">
              {state === "done" ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-5 place-items-center rounded-full bg-veg text-coal">
                  <Check className="size-3" strokeWidth={3.5} />
                </motion.span>
              ) : state === "running" ? (
                <LoaderCircle className="size-4 animate-spin text-accent" />
              ) : (
                <span className="size-2 rounded-full bg-edge/30" />
              )}
            </span>
            <span className={cn(state === "running" ? "text-accent" : "text-cream")}>{stage.cmd}</span>
            <span className="ml-auto truncate text-cream/40">{stage.detail}</span>
          </div>
        );
      })}
      <div className="h-5 pt-1 text-veg light:text-green-700">
        <AnimatePresence>
          {step >= PIPELINE.length && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              ✓ Order shipped. Zero bugs, extra chutney.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function WhyUs() {
  const { scrollTo, menu, settings } = useStore();
  const vegCount = menu.filter((i) => i.isVeg).length;
  const eggSpecials = menu.filter((i) => i.category === "egg").length;
  const paneerCount = menu.filter((i) => /paneer/i.test(i.name)).length;
  const lowest = Math.min(...menu.map((i) => i.price));

  return (
    <section id="why" className="py-24 sm:py-32">
      <div className="container-x">
        <div className="max-w-3xl">
          <Eyebrow>why techies come back</Eyebrow>
          <h2 className="mt-4 font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <RevealText text="Built like good software. Simple, fast, reliable." highlight={["reliable."]} />
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto]">
          <Reveal className="md:col-span-2 lg:row-span-2">
            <div onMouseMove={trackSpotlight} className="spotlight theme-dark group relative h-full min-h-[420px] overflow-hidden rounded-[28px] border border-edge/10 text-cream">
              <img src="/images/chowmein.jpg" alt="Chowmein tossed with fresh vegetables" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <p className="font-script text-3xl text-accent">fresh, every batch</p>
                <h3 className="mt-2 font-display text-4xl leading-none font-bold sm:text-5xl">Cooked when you order it.</h3>
                <p className="mt-3 max-w-md text-cream/65">Chowmein hits the wok, paranthas hit the tawa, momos hit the steamer. That's how canteen food should be.</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <Card className="h-full">
              <p className="font-mono text-xs tracking-widest text-cream/45 uppercase">starting at</p>
              <p className="mt-4 font-display text-7xl font-extrabold text-accent">
                <AnimatedNumber value={Number.isFinite(lowest) ? lowest : 30} prefix="₹" />
              </p>
              <p className="mt-3 text-sm text-cream/60">Aloo patties and boiled eggs. Lunch money stays in your pocket.</p>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="h-full">
              <Leaf className="size-6 text-veg" />
              <p className="mt-4 font-display text-7xl font-extrabold">
                <AnimatedNumber value={vegCount} />
              </p>
              <p className="mt-3 text-sm text-cream/60">vegetarian dishes out of {menu.length}, with clear veg / non-veg marks on every item.</p>
            </Card>
          </Reveal>

          <Reveal delay={0.15} className="md:col-span-2">
            <Card className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-bold">Ship food like you ship code.</h3>
                  <p className="mt-1 text-sm text-cream/55">From order to your room in one clean pipeline.</p>
                </div>
                <span className="rounded-full border border-veg/30 bg-veg/10 px-2.5 py-1 font-mono text-[11px] text-veg light:text-green-700">passing</span>
              </div>
              <Pipeline />
            </Card>
          </Reveal>

          <Reveal className="md:col-span-2">
            <Card className="flex h-full flex-col gap-6 p-0 sm:flex-row">
              <img src="/images/omelette.jpg" alt="Masala omelette with toast" loading="lazy" className="h-56 w-full object-cover sm:h-auto sm:w-2/5" />
              <div className="p-7 sm:pl-0">
                <p className="-rotate-3 font-script text-4xl text-accent">Protein Power!</p>
                <h3 className="mt-3 font-display text-2xl font-bold">Gym day? We've got you.</h3>
                <p className="mt-2 text-sm text-cream/60">
                  {eggSpecials} egg specials made with 2 eggs each, plus paneer in {paneerCount} dishes, from rolls to paranthas.
                </p>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.05} className="md:col-span-2">
            <Card className="h-full">
              <h3 className="font-display text-2xl font-bold">Order. Relax. Eat in your room.</h3>
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: ShoppingBag, title: "Fill your cart", text: `Free delivery over ${rupee(settings.freeDeliveryThreshold)}, else just ${rupee(settings.deliveryCharge)}.` },
                  { icon: Check, title: "Place the order", text: "Name, mobile, hostel and room. That's it." },
                  { icon: WhatsAppIcon, title: "Confirm on WhatsApp", text: "One tap sends the full order to the canteen." },
                ].map(({ icon: Icon, title, text }, i) => (
                  <li key={title} className="relative rounded-2xl border border-edge/10 bg-edge/[0.02] p-4">
                    <span className="font-mono text-xs text-cream/35">0{i + 1}</span>
                    <Icon className="mt-3 size-5 text-accent" />
                    <p className="mt-3 text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-cream/50">{text}</p>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => scrollTo("menu")} className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Start an order <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
