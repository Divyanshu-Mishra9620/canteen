import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { EmblaCarouselType } from "embla-carousel";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { ArrowLeft, ArrowRight, Flame, Star } from "lucide-react";
import { TAG_LABEL } from "../data/menu";
import { useStore } from "../context/store";
import { rupee } from "../lib/utils";
import { AddToTray, Eyebrow, RevealText, VegMark } from "./ui/primitives";

const PARALLAX = 0.045;
/** The image layer is 150% wide, so it can shift ±16% of itself before an edge shows. */
const MAX_SHIFT = 16;

export function Signature() {
  const { menu, categories } = useStore();

  // Owner-flagged "recommended" dishes, most-ordered first; topped up with popular dishes if few are flagged.
  const items = useMemo(() => {
    const byPopularity = [...menu].sort((a, b) => b.orderCount - a.orderCount);
    const picks = byPopularity.filter((i) => i.isRecommended);
    for (const i of byPopularity) if (picks.length < 6 && !picks.includes(i)) picks.push(i);
    return picks.slice(0, 10);
  }, [menu]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  const [emblaRef, api] = useEmblaCarousel({ loop: true, align: "start", skipSnaps: false }, [
    Autoplay({ delay: 3600, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState(0);
  const layers = useRef<HTMLElement[]>([]);

  // Embla's parallax recipe: shift each image opposite to its distance from the snap point.
  const tween = useCallback((embla: EmblaCarouselType, event?: string) => {
    const engine = embla.internalEngine();
    const scrollProgress = embla.scrollProgress();
    const inView = embla.slidesInView();
    const factor = PARALLAX * embla.scrollSnapList().length;

    embla.scrollSnapList().forEach((snap, snapIndex) => {
      let diff = snap - scrollProgress;
      engine.slideRegistry[snapIndex].forEach((slideIndex) => {
        if (event === "scroll" && !inView.includes(slideIndex)) return;
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loop) => {
            const target = loop.target();
            if (slideIndex === loop.index && target !== 0) {
              diff = Math.sign(target) === -1 ? snap - (1 + scrollProgress) : snap + (1 - scrollProgress);
            }
          });
        }
        const node = layers.current[slideIndex];
        const shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, diff * -factor * 100));
        if (node) node.style.transform = `translateX(${shift}%)`;
      });
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    const onScroll = (embla: EmblaCarouselType, event: string) => {
      tween(embla, event);
      setProgress(Math.max(0, Math.min(1, embla.scrollProgress())));
    };
    onSelect();
    tween(api);
    api.on("select", onSelect).on("reInit", onSelect).on("scroll", onScroll).on("reInit", tween).on("slideFocus", tween);
    return () => {
      api.off("select", onSelect).off("reInit", onSelect).off("scroll", onScroll).off("reInit", tween).off("slideFocus", tween);
    };
  }, [api, tween]);

  // Floating "Drag" cursor while hovering the track (pointer devices only).
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const sx = useSpring(cx, { stiffness: 500, damping: 40 });
  const sy = useSpring(cy, { stiffness: 500, damping: 40 });
  const [cursor, setCursor] = useState(false);

  return (
    <section id="signature" className="relative py-24 sm:py-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Eyebrow>top recommended</Eyebrow>
            <h2 className="mt-4 font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <RevealText text="The ones everyone keeps ordering." highlight={["ordering."]} />
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-mono text-sm text-cream/50 tabular-nums">
              <span className="text-cream">{String(selected + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}
            </p>
            <div className="flex gap-2">
              {[
                { label: "Previous dish", icon: ArrowLeft, onClick: () => api?.scrollPrev() },
                { label: "Next dish", icon: ArrowRight, onClick: () => api?.scrollNext() },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={onClick}
                  className="grid size-12 place-items-center rounded-full border border-edge/15 transition hover:border-brand hover:bg-brand hover:text-coal"
                >
                  <Icon className="size-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative mt-14 md:cursor-none"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          cx.set(e.clientX);
          cy.set(e.clientY);
          setCursor(!(e.target as HTMLElement).closest("button"));
        }}
        onPointerLeave={() => setCursor(false)}
      >
        <div ref={emblaRef} className="overflow-hidden pl-4 sm:pl-6 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <div className="flex touch-pan-y touch-pinch-zoom">
            {items.map((item, i) => (
              <div key={item.id} className="min-w-0 shrink-0 grow-0 basis-[82%] pr-4 sm:basis-[46%] sm:pr-6 lg:basis-[31%]">
                <article className="theme-dark group relative aspect-[4/5] overflow-hidden rounded-[28px] border border-edge/10 bg-ink-850 text-cream">
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      ref={(el) => {
                        if (el) layers.current[i] = el;
                      }}
                      className="absolute inset-y-0 -left-1/4 w-[150%]"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        draggable={false}
                        className={`size-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06] ${item.isAvailable ? "" : "grayscale"}`}
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" />

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="flex items-center gap-1.5 rounded-full bg-ink-950/60 py-1.5 pr-3 pl-2 text-xs font-medium backdrop-blur-md">
                        <VegMark veg={item.isVeg} /> {categoryName(item.category)}
                      </span>
                      {item.tags?.includes("spicy") && (
                        <span className="flex items-center gap-1 rounded-full bg-chili/90 px-2.5 py-1.5 text-xs font-semibold text-coal">
                          <Flame className="size-3.5" /> {TAG_LABEL.spicy}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-cream/60">{String(i + 1).padStart(2, "0")}</span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="flex items-end justify-between gap-3">
                      <h3 className="font-display text-3xl leading-none font-bold sm:text-[2.1rem]">{item.name}</h3>
                      <span className="font-display text-2xl font-bold text-accent">{rupee(item.price)}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-cream/60">{item.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <AddToTray id={item.id} />
                      <span className="flex items-center gap-1 text-xs text-cream/45">
                        {item.isRecommended ? (
                          <>
                            <Star className="size-3 fill-current" /> Recommended
                          </>
                        ) : (
                          `${item.prepTime} min`
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {cursor && (
            <motion.div
              className="pointer-events-none fixed top-0 left-0 z-50 hidden md:block"
              style={{ x: sx, y: sy }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              <div className="grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand font-mono text-[11px] font-bold tracking-widest text-coal uppercase shadow-xl">
                ← Drag →
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="container-x mt-10">
        <div className="relative h-[2px] overflow-hidden rounded-full bg-edge/10">
          <motion.div
            className="absolute inset-y-0 left-0 w-full origin-left bg-brand"
            animate={{ scaleX: 0.12 + progress * 0.88 }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>
    </section>
  );
}
