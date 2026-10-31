import { useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { Category, MenuItem } from "../data/menu";
import { useStore } from "../context/store";
import { useMediaQuery } from "../hooks";
import { rupee } from "../lib/utils";
import { Eyebrow, FoodImage, RevealText } from "./ui/primitives";

function CategoryPanel({ category, items, index, onPick }: { category: Category; items: MenuItem[]; index: number; onPick: () => void }) {
  const prices = items.map((i) => i.price);
  return (
    <article className="theme-dark group relative aspect-[4/5] w-[80vw] max-w-[440px] shrink-0 snap-start overflow-hidden rounded-[32px] border border-edge/10 bg-ink-850 text-cream md:aspect-auto md:h-[72vh] md:w-[min(34vw,500px)] md:max-w-none">
      <FoodImage
        src={category.imageUrl || items[0]?.imageUrl || ""}
        alt={category.name}
        category={category.id}
        className="absolute inset-0 size-full transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
        <span className="font-display text-7xl leading-none font-extrabold text-cream/85">{String(index + 1).padStart(2, "0")}</span>
        <span className="rounded-full bg-ink-950/60 px-3 py-1.5 font-mono text-xs backdrop-blur-md">{items.length} items</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        {prices.length > 0 && (
          <p className="font-mono text-xs text-accent">
            {rupee(Math.min(...prices))} – {rupee(Math.max(...prices))}
          </p>
        )}
        <h3 className="mt-2 font-display text-5xl leading-[0.9] font-extrabold tracking-tight sm:text-6xl">{category.name}</h3>
        {category.tagline && <p className="mt-3 max-w-xs text-sm text-cream/65">{category.tagline}</p>}
        <button
          type="button"
          onClick={onPick}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-brand hover:text-coal"
        >
          See {category.name.toLowerCase()}
          <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" />
        </button>
      </div>
    </article>
  );
}

function Intro({ categoryCount, dishCount }: { categoryCount: number; dishCount: number }) {
  return (
    <div className="max-w-md shrink-0 md:w-[min(36vw,520px)] md:max-w-none md:pr-8">
      <Eyebrow>explore by craving</Eyebrow>
      <h2 className="mt-4 font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl">
        <RevealText text="Pick a craving. We'll handle the rest." highlight={["craving."]} />
      </h2>
      <p className="mt-6 text-lg text-cream/60">
        {categoryCount} categories, {dishCount} dishes, one tiny kitchen that never stops.
      </p>
      <p className="mt-8 hidden items-center gap-2 font-mono text-xs text-cream/40 md:flex">
        <ArrowDown className="size-4 animate-bounce" /> keep scrolling to move sideways
      </p>
    </div>
  );
}

export function Explore() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { menu, categories, setMenuCategory, scrollTo } = useStore();
  const pick = (id: Category["id"]) => {
    setMenuCategory(id);
    scrollTo("menu-list", -150);
  };

  const withItems = categories.map((c) => ({ category: c, items: menu.filter((i) => i.category === c.id) })).filter((c) => c.items.length);
  const panels = withItems.map(({ category, items }, i) => (
    <CategoryPanel key={category.id} category={category} items={items} index={i} onPick={() => pick(category.id)} />
  ));
  const intro = <Intro categoryCount={withItems.length} dishCount={menu.length} />;

  if (!isDesktop) {
    return (
      <section id="explore" className="py-24">
        <div className="container-x">{intro}</div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4">{panels}</div>
      </section>
    );
  }

  return (
    <PinnedTrack count={withItems.length} intro={intro}>
      {panels}
    </PinnedTrack>
  );
}

/** Vertical scroll drives a horizontal track while the section is pinned. */
function PinnedTrack({ children, intro, count }: { children: React.ReactNode; intro: React.ReactNode; count: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const dist = useMotionValue(0);

  useLayoutEffect(() => {
    const measure = () => {
      const d = Math.max(0, trackRef.current!.scrollWidth - window.innerWidth);
      dist.set(d);
      setDistance(d);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trackRef.current!);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [dist]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(() => -scrollYProgress.get() * dist.get());

  return (
    <section id="explore" ref={sectionRef} className="relative" style={{ height: `calc(${distance}px + 100vh)` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <motion.div
          ref={trackRef}
          style={{ x }}
          className="flex w-max items-center gap-6 pr-8 pl-[max(2rem,calc((100vw-80rem)/2+2rem))]"
        >
          {intro}
          {children}
        </motion.div>
        <div className="container-x absolute inset-x-0 bottom-8">
          <div className="flex items-center gap-4 font-mono text-xs text-cream/40">
            <span>01</span>
            <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-edge/10">
              <motion.div className="h-full origin-left bg-brand" style={{ scaleX: scrollYProgress }} />
            </div>
            <span>{String(count).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
