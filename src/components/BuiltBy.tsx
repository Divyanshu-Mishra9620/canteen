import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { DEVELOPER } from "../data/site";

const DISMISS_KEY = "techies-taste:builtby-dismissed";

/** Thin brand-coloured bar showing page progress. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return <motion.div className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-brand" style={{ scaleX }} />;
}

/** Floating credit chip that marks the site as a freelance build. */
export function BuiltBy({ show }: { show: boolean }) {
  const [footerVisible, setFooterVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // The footer carries the same credit, so step aside instead of covering it.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      {show && !dismissed && !footerVisible && (
        <motion.div
          // Phones skip the chip: the bottom edge belongs to the "View Cart" bar, and the footer carries the credit.
          className="group fixed bottom-4 left-4 z-40 flex items-center rounded-full border border-edge/10 bg-ink-900/85 shadow-xl shadow-black/40 backdrop-blur-xl max-md:hidden light:shadow-black/10"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 26 }}
        >
          <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-1.5 sm:pr-2">
            <span className="relative grid size-9 place-items-center rounded-full bg-cream font-display text-sm font-bold text-ink-950">
              {DEVELOPER.initials}
              <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-ink-900 bg-veg" />
            </span>
            <span className="hidden text-xs leading-tight sm:block">
              <span className="block text-cream/45">Designed & built by</span>
              <span className="flex items-center gap-1 font-semibold">
                {DEVELOPER.firstName} · open for work
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </span>
          </a>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide credit"
            className="mr-1.5 hidden size-6 place-items-center rounded-full text-cream/40 transition hover:bg-edge/10 hover:text-cream sm:grid"
          >
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
