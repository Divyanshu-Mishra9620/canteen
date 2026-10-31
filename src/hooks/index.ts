import { useEffect, useState } from "react";
import { SITE } from "../data/site";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Live open/closed status that re-checks every 30 seconds. */
export function useOpenStatus() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { open, close } = SITE.hours;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = minutes >= open * 60 && minutes < close * 60;
  const until = isOpen ? close * 60 - minutes : ((open * 60 - minutes + 1440) % 1440) || 1440;
  const h = Math.floor(until / 60);
  const m = until % 60;
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return { isOpen, countdown };
}
