import { createContext, useCallback, useContext, useState, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../lib/utils";

export type Theme = "dark" | "light";

const THEME_KEY = "techies-taste:theme";
const ThemeContext = createContext<{ theme: Theme; toggle: (e?: MouseEvent) => void } | null>(null);

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f2e9" : "#0a0a0a");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html already applied the saved/system theme before paint.
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));

  const toggle = useCallback(
    (e?: MouseEvent) => {
      const next: Theme = theme === "dark" ? "light" : "dark";
      const swap = () => {
        apply(next);
        setTheme(next);
      };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || reduce) return swap();

      // Circular reveal of the new theme, growing from the click point.
      const x = e?.clientX ?? window.innerWidth - 40;
      const y = e?.clientY ?? 40;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = document.startViewTransition(() => flushSync(swap));
      transition.ready
        .then(() =>
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
          ),
        )
        .catch(() => {});
    },
    [theme],
  );

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-edge/10 bg-edge/[0.04] text-cream/70 transition hover:border-edge/25 hover:text-cream",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 18, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -18, rotate: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
          <Icon className="size-4" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
