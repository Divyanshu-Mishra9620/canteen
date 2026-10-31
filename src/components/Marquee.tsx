import { useRef, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "motion/react";
import { Sparkle } from "lucide-react";
import { cn } from "../lib/utils";

/** Infinite strip whose speed and direction follow the page's scroll velocity. */
function VelocityStrip({ children, baseVelocity }: { children: ReactNode; baseVelocity: number }) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    moveBy += direction.current * moveBy * f;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="flex overflow-hidden whitespace-nowrap">
      <motion.div className="flex shrink-0 whitespace-nowrap" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex shrink-0 items-center" aria-hidden={i > 0}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const WORDS = ["Eat", "Relax", "Repeat", "Fresh", "Tasty", "Affordable"];

function Words({ muted }: { muted?: boolean }) {
  return (
    <>
      {WORDS.map((w) => (
        <span key={w} className="flex items-center">
          <span className="px-6 font-display text-5xl font-extrabold tracking-tight uppercase sm:text-7xl">{w}</span>
          <Sparkle className={cn("size-8 sm:size-10", muted ? "text-accent" : "fill-coal")} />
        </span>
      ))}
    </>
  );
}

export function Marquee() {
  return (
    <section aria-label="Eat, relax, repeat" className="relative z-10 -my-6 overflow-hidden py-16">
      {/* Opposite tilts with a small overlap: the bands meet on the left and fan apart to the right. */}
      <div className="rotate-[-2.5deg] bg-ink-800 py-4 text-cream/25">
        <VelocityStrip baseVelocity={2}>
          <Words muted />
        </VelocityStrip>
      </div>
      <div className="-mt-4 rotate-[2.5deg] bg-brand py-4 text-coal shadow-[0_20px_60px_-20px] shadow-brand/40">
        <VelocityStrip baseVelocity={-2.5}>
          <Words />
        </VelocityStrip>
      </div>
    </section>
  );
}
