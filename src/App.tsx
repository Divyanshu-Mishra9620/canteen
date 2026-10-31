import { useCallback, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { ReactLenis } from "lenis/react";
import { StoreProvider } from "./context/store";
import { ThemeProvider } from "./context/theme";
import { ThemedToaster } from "./components/ThemedToaster";
import { Preloader } from "./components/Preloader";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
// import { Signature } from "./components/Signature";
// import { Explore } from "./components/Explore";
import { MenuSection } from "./components/MenuSection";
import { Planner } from "./components/Planner";
// import { WhyUs } from "./components/WhyUs";
import { Visit } from "./components/Visit";
import { Footer } from "./components/Footer";
import { CartBar, CartDrawer } from "./components/CartDrawer";
import { CommandMenu } from "./components/CommandMenu";
import { BuiltBy, ScrollProgress } from "./components/BuiltBy";

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function SmoothScroll({ children }: { children: ReactNode }) {
  if (reducedMotion) return <>{children}</>;
  return (
    <ReactLenis
      root
      options={{ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.4 }}
    >
      {children}
    </ReactLenis>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(reducedMotion);
  const onLoaded = useCallback(() => setLoaded(true), []);

  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <SmoothScroll>
          <StoreProvider locked={!loaded}>
            <AnimatePresence>
              {!loaded && <Preloader onDone={onLoaded} />}
            </AnimatePresence>

            <ScrollProgress />
            <Navbar />
            <main>
              <Hero ready={loaded} />
              <Marquee />
              <MenuSection />
              {/* <Signature /> */}
              {/* <Explore /> */}
              <Planner />
              {/* <WhyUs /> */}
              <Visit />
            </main>
            <Footer />

            <CartBar />
            <CartDrawer />
            <CommandMenu />
            <BuiltBy show={loaded} />
            <ThemedToaster />
            <div className="grain" aria-hidden />
          </StoreProvider>
        </SmoothScroll>
      </MotionConfig>
    </ThemeProvider>
  );
}
