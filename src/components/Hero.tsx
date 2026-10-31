import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Dices, MoveHorizontal, Utensils } from "lucide-react";
import { HERO_STACK } from "../data/menu";
import { useStore } from "../context/store";
import { cn, rupee } from "../lib/utils";
import { AddToTray, AnimatedNumber, Button, Magnetic, RotatingBadge, VegMark } from "./ui/primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

function Line({ children, ready, delay }: { children: React.ReactNode; ready: boolean; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: ready ? "0%" : "110%" }}
        transition={{ duration: 1.1, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollTo, add, menu, settings } = useStore();
  const [rolls, setRolls] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const available = menu.filter((i) => i.isAvailable);
  const surprise = () => {
    setRolls((r) => r + 1);
    if (available.length) add(available[Math.floor(Math.random() * available.length)].id);
  };

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: ready ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <section id="top" ref={ref} className="relative overflow-hidden pt-28 pb-20 sm:pt-36 lg:flex lg:min-h-[100svh] lg:items-center lg:pt-28">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_90%_70%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-48 right-[-15%] size-[720px] rounded-full bg-brand/15 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-[-20%] size-[520px] rounded-full bg-chili/10 blur-[140px]" />

      <motion.div style={{ y: contentY, opacity: fade }} className="container-x relative grid items-center gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <motion.div {...fadeUp(0.1)} className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-edge/10 bg-edge/[0.04] py-1.5 pr-4 pl-2 text-sm backdrop-blur">
            <span className={cn("relative flex size-2.5", settings.isOpen ? "text-veg" : "text-chili")}>
              <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
              <span className="relative size-2.5 rounded-full bg-current" />
            </span>
            <span className="font-semibold">{settings.isOpen ? "Open now" : "Closed right now"}</span>
            <span className="text-cream/50">· {settings.isOpen ? "taking orders" : "ordering paused"}</span>
          </motion.div>

          <h1 className="font-display text-[clamp(3.1rem,6.4vw,6.4rem)] leading-[0.9] font-extrabold tracking-[-0.03em]">
            <Line ready={ready} delay={0.15}>Fuel for your</Line>
            <Line ready={ready} delay={0.25}>
              next{" "}
              <span className="relative inline-block text-accent">
                commit.
                <svg viewBox="0 0 300 24" className="absolute -bottom-[0.12em] left-0 h-[0.22em] w-full overflow-visible" aria-hidden>
                  <motion.path
                    d="M4 16 C 60 4, 110 22, 160 12 S 260 6, 296 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: ready ? 1 : 0 }}
                    transition={{ duration: 1.2, ease: EASE, delay: 0.9 }}
                  />
                </svg>
              </span>
            </Line>
          </h1>

          <motion.p {...fadeUp(0.45)} className="mt-8 max-w-xl text-lg leading-relaxed text-cream/65 sm:text-xl">
            Steaming momos, loaded rolls, wok-tossed chowmein and hot paranthas, delivered to your hostel room.
            Starting at just <span className="font-semibold text-cream">₹30</span>.
          </motion.p>

          <motion.div {...fadeUp(0.55)} className="mt-10 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Button size="lg" onClick={() => scrollTo("menu")}>
                Order now
                <ArrowRight className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Button>
            </Magnetic>
            <Button size="lg" variant="ghost" onClick={surprise}>
              <motion.span animate={{ rotate: rolls * 360 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
                <Dices className="size-5 text-accent" />
              </motion.span>
              Surprise me
            </Button>
          </motion.div>

          <motion.dl {...fadeUp(0.7)} className="mt-14 grid max-w-lg grid-cols-3 divide-x divide-edge/10 border-t border-edge/10 pt-6">
            {[
              { value: menu.length, label: "dishes on the menu" },
              { value: Math.min(...menu.map((i) => i.price)), label: "starting price", prefix: "₹" },
              { value: menu.filter((i) => i.isVeg).length, label: "veg favourites" },
            ].map((stat) => (
              <div key={stat.label} className="px-4 first:pl-0">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-3xl font-bold sm:text-4xl">
                  {ready ? <AnimatedNumber value={stat.value} prefix={stat.prefix} /> : `${stat.prefix ?? ""}0`}
                </dd>
                <p className="mt-1 text-xs text-cream/50 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          className="relative lg:col-span-5"
          initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
          animate={ready ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
          transition={{ duration: 1.2, ease: EASE, delay: 0.35 }}
        >
          <HeroStack />
        </motion.div>
      </motion.div>
    </section>
  );
}

type Leaving = { index: number; dir: 1 | -1 } | null;

/** Swipeable, auto-cycling deck of dishes. */
function HeroStack() {
  const { itemById, categories } = useStore();
  const items = HERO_STACK.map((id) => itemById[id]).filter(Boolean);
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [leaving, setLeaving] = useState<Leaving>(null);
  const [paused, setPaused] = useState(false);

  // Keep the deck order valid if the menu changes underneath us.
  useEffect(() => {
    if (order.length !== items.length) setOrder(items.map((_, i) => i));
  }, [items.length, order.length]);

  const cycle = useCallback((dir: 1 | -1) => setLeaving((l) => l ?? { index: order[0], dir }), [order]);

  useEffect(() => {
    if (paused || leaving || items.length < 2) return;
    const t = setTimeout(() => cycle(1), 3800);
    return () => clearTimeout(t);
  }, [paused, leaving, cycle, items.length]);

  const finish = () => {
    setOrder((o) => [...o.slice(1), o[0]]);
    setLeaving(null);
  };

  const front = items[order[0]];
  if (!front) return null;

  return (
    <div className="relative mx-auto w-full max-w-[400px] pt-6">
      <div
        className="relative aspect-[4/5]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {items.map((item, i) => {
          const depth = order.indexOf(i);
          const isLeaving = leaving?.index === i;
          const isTop = depth === 0 && !isLeaving;
          const pose = isLeaving
            ? { x: leaving.dir * 520, y: 0, rotate: leaving.dir * 24, scale: 1, opacity: 0 }
            : {
                x: 0,
                y: depth * -22,
                rotate: depth === 0 ? 0 : depth % 2 ? 5 : -5,
                scale: 1 - depth * 0.06,
                opacity: depth <= 2 ? 1 : 0,
              };

          return (
            <motion.article
              key={item.id}
              className={cn(
                "theme-dark absolute inset-0 overflow-hidden rounded-[28px] border border-edge/10 bg-ink-800 text-cream shadow-2xl shadow-black/60 light:shadow-black/25",
                isTop && "cursor-grab active:cursor-grabbing",
              )}
              style={{ zIndex: isLeaving ? 20 : items.length - depth }}
              animate={pose}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
              drag={isTop ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.85}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) {
                  cycle(info.offset.x > 0 ? 1 : -1);
                }
              }}
              onAnimationComplete={() => {
                if (isLeaving) finish();
              }}
              aria-hidden={!isTop}
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                draggable={false}
                className="pointer-events-none size-full object-cover select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                <span className="flex items-center gap-2 rounded-full bg-ink-950/60 py-1.5 pr-3 pl-2 text-xs font-medium backdrop-blur-md">
                  <VegMark veg={item.isVeg} />
                  {categories.find((c) => c.id === item.category)?.name}
                </span>
                <span className="rounded-full bg-brand px-3 py-1.5 font-display text-sm font-bold text-coal">{rupee(item.price)}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                <div>
                  <h3 className="font-display text-3xl font-bold">{item.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-cream/65">{item.description}</p>
                </div>
                {isTop && <AddToTray id={item.id} className="shrink-0" />}
              </div>
            </motion.article>
          );
        })}

        <RotatingBadge
          text="eat • relax • repeat • "
          className="absolute top-[30%] -left-14 z-30 hidden size-28 rounded-full bg-brand text-coal shadow-xl shadow-brand/20 sm:grid"
        >
          <Utensils className="size-6" />
        </RotatingBadge>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.id}
              className={cn("h-1.5 rounded-full transition-all duration-500", order[0] === i ? "w-8 bg-brand" : "w-1.5 bg-edge/20")}
            />
          ))}
        </div>
        <p className="flex items-center gap-2 font-mono text-xs text-cream/45">
          <MoveHorizontal className="size-4" /> swipe the deck
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {front.name}
      </p>
    </div>
  );
}
