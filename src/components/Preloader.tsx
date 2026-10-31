import { useEffect } from "react";
import { motion } from "motion/react";
import { ChefHat } from "lucide-react";
import { SITE } from "../data/site";

/** How long the splash stays on screen before fading into the page. */
export const SPLASH_MS = 2000;

const EASE = [0.16, 1, 0.3, 1] as const;

/** Splash screen: chef-hat logo, name and tagline, centred for exactly 2 seconds. */
export function Preloader({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-ink-950 px-6"
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.6, ease: EASE }}
      aria-busy="true"
      aria-label="Loading Techie's Taste"
    >
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute size-[420px] rounded-full bg-brand/15 blur-[120px]" />

      <div className="relative flex flex-col items-center text-center">
        <motion.span
          className="grid size-20 place-items-center rounded-[26px] bg-brand text-coal shadow-[0_0_60px_-10px] shadow-brand/70 sm:size-24"
          initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
        >
          <ChefHat className="size-10 sm:size-12" strokeWidth={2} />
        </motion.span>

        <motion.h1
          className="mt-7 font-display text-5xl leading-none font-extrabold tracking-tight sm:text-7xl"
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        >
          Techie's <span className="text-accent">Taste</span>
        </motion.h1>

        <motion.p
          className="mt-4 font-script text-2xl text-cream/70 sm:text-3xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
        >
          {SITE.tagline}
        </motion.p>

        <div className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-edge/10">
          <motion.div
            className="h-full origin-left rounded-full bg-brand"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: SPLASH_MS / 1000, ease: "linear" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
