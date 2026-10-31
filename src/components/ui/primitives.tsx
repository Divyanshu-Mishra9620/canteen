import { useEffect, useId, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useStore } from "../../context/store";
import { categoryIcon, cn } from "../../lib/utils";

/** Indian food-label convention: green dot = veg, red triangle = egg / non-veg. */
export function VegMark({ veg, className }: { veg: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      title={veg ? "Veg" : "Non-veg"}
      className={cn(
        "inline-grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px] bg-ink-950/40",
        veg ? "border-veg" : "border-nonveg",
        className,
      )}
    >
      {veg ? (
        <span className="size-2 rounded-full bg-veg" />
      ) : (
        <span className="size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-nonveg" />
      )}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-xs tracking-[0.2em] text-accent uppercase", className)}>
      <span className="text-cream/30">{"// "}</span>
      {children}
    </p>
  );
}

/** Splits a heading into words that slide up from a mask when scrolled into view. */
export function RevealText({
  text,
  className,
  delay = 0,
  highlight = [],
}: {
  text: string;
  className?: string;
  delay?: number;
  highlight?: string[];
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  return (
    <span ref={ref} className={cn("inline", className)} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={cn("inline-block", highlight.includes(word) && "text-accent")}
            initial={{ y: "110%" }}
            animate={inView ? { y: "0%" } : undefined}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.05 }}
          >
            {word}
            {" "}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Reveal({ children, className, delay = 0, y = 32 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/** Pulls itself toward the cursor while hovered. */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });

  const onMove = (e: MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} style={{ x, y }} onMouseMove={onMove} onMouseLeave={reset} className={cn("inline-block", className)}>
      {children}
    </motion.div>
  );
}

type ButtonStyle = { variant?: "primary" | "ghost" | "dark"; size?: "sm" | "md" | "lg" };

/** Shared button styling, so links can look like buttons without nesting a <button> in an <a>. */
export function buttonClass({ variant = "primary", size = "md" }: ButtonStyle, className?: string) {
  return cn(
    "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40",
    size === "sm" && "h-9 px-4 text-sm",
    size === "md" && "h-12 px-6 text-[15px]",
    size === "lg" && "h-14 px-8 text-base",
    variant === "primary" && "bg-brand text-coal hover:bg-brand-300",
    variant === "ghost" && "border border-edge/15 bg-edge/[0.03] text-cream backdrop-blur hover:border-edge/30 hover:bg-edge/[0.07]",
    variant === "dark" && "bg-coal text-paper hover:bg-[#1c1c1c]",
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & ButtonStyle) {
  return <button type="button" {...props} className={buttonClass({ variant, size }, className)} />;
}

/** "Add" pill that morphs into a − qty + stepper once the item is in the cart. Shows "Sold out" when unavailable. */
export function AddToTray({
  id,
  className,
  tone = "brand",
  label = "Add",
}: {
  id: string;
  className?: string;
  tone?: "brand" | "glass";
  label?: string;
}) {
  const { lines, add, setQty, itemById } = useStore();
  const qty = lines[id] ?? 0;
  const available = itemById[id]?.isAvailable !== false;

  if (!available) {
    return (
      <span
        className={cn(
          "flex h-10 items-center rounded-full border border-edge/15 bg-ink-950/70 px-4 text-xs font-semibold tracking-wide text-cream/60 uppercase backdrop-blur",
          className,
        )}
      >
        Sold out
      </span>
    );
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={cn(
        "relative flex h-10 items-center overflow-hidden rounded-full text-sm font-semibold",
        tone === "brand" ? "bg-brand text-coal shadow-lg shadow-brand/20" : "border border-edge/20 bg-ink-950/60 text-cream backdrop-blur-md",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              add(id);
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex h-full items-center gap-1.5 px-4"
            aria-label={`Add ${itemById[id]?.name ?? "item"} to cart`}
          >
            <Plus className="size-4" strokeWidth={2.5} />
            {label}
          </motion.button>
        ) : (
          <motion.div
            key="stepper"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex h-full items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" aria-label="Remove one" onClick={() => setQty(id, qty - 1)} className="grid h-full w-9 place-items-center hover:opacity-70">
              <Minus className="size-4" strokeWidth={2.5} />
            </button>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={qty}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                className="w-5 text-center tabular-nums"
                aria-live="polite"
              >
                {qty}
              </motion.span>
            </AnimatePresence>
            <button type="button" aria-label="Add one more" onClick={() => setQty(id, qty + 1)} className="grid h-full w-9 place-items-center hover:opacity-70">
              <Plus className="size-4" strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Lazy food photo with a shimmer while loading and a branded placeholder if missing/broken. */
export function FoodImage({
  src,
  alt,
  category,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  category?: string;
  className?: string;
  eager?: boolean;
}) {
  // State is keyed by URL, so a cached image that fires `load` immediately can't be reset back
  // to "loading" by a later effect, and a new `src` starts fresh automatically.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const state = !src || failedSrc === src ? "error" : loadedSrc === src ? "loaded" : "loading";
  const Icon = categoryIcon(category ?? "");

  return (
    <div className={cn("relative overflow-hidden bg-ink-850", className)}>
      {state === "loading" && <div className="skeleton absolute inset-0" />}
      {state === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand/25 via-ink-850 to-ink-850">
          <div className="flex flex-col items-center gap-1 text-accent">
            <Icon className="size-7" />
            <span className="max-w-[90%] text-center font-display text-[11px] leading-tight font-semibold text-cream/60">{alt}</span>
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cn("size-full object-cover transition-opacity duration-500", state === "loaded" ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}

/** Circular text that slowly rotates around a centre icon. */
export function RotatingBadge({ text, children, className }: { text: string; children?: ReactNode; className?: string }) {
  const pathId = useId();
  return (
    <div className={cn("relative grid size-32 place-items-center", className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-spin-slow" aria-hidden>
        <defs>
          <path id={pathId} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-current font-mono text-[10px] font-semibold uppercase">
          {/* Stretch the text to exactly one lap (2π·38 ≈ 239) so it never overlaps itself. */}
          <textPath href={`#${pathId}`} textLength={236} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      {children}
    </div>
  );
}

/** Counts up to `value` once visible, then springs to any later value. */
export function AnimatedNumber({ value, className, prefix = "" }: { value: number; className?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString("en-IN")}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, value, mv]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </motion.span>
  );
}

/** Sets --x / --y on the element so `.spotlight::before` can follow the pointer. */
export function trackSpotlight(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
}
