import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUp, ArrowUpRight, Clock3, MapPin, Phone } from "lucide-react";
import { DEVELOPER, SITE, mapsLink } from "../data/site";
import { useStore } from "../context/store";
import { whatsappTo } from "../lib/orders";
import { formatHour } from "../lib/utils";
import { GitHubIcon, WhatsAppIcon } from "./ui/icons";
import { Logo } from "./Navbar";

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { categories, setMenuCategory, scrollTo, settings } = useStore();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const wordY = useTransform(scrollYProgress, [0, 1], ["40%", "0%"]);

  return (
    <footer ref={ref} className="relative mt-10 overflow-hidden border-t border-edge/10 pt-20">
      <div className="container-x grid gap-12 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Logo />
          <p className="mt-5 max-w-xs text-cream/55">{SITE.tagline}. Fresh, tasty and affordable food for the people who build things.</p>
          <p className="mt-6 font-script text-2xl text-accent">Eat • Relax • Repeat</p>
        </div>

        <div className="lg:col-span-3">
          <p className="font-mono text-xs tracking-widest text-cream/40 uppercase">Visit & contact</p>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <p className="text-cream/80">{SITE.address}</p>
                <a href={mapsLink()} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline">
                  Open in Google Maps <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" />
              <p className="text-cream/80">
                Open daily · {formatHour(SITE.hours.open)} – {formatHour(SITE.hours.close)}
              </p>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={`tel:+91${SITE.phone}`}
              className="flex h-11 items-center gap-2 rounded-full border border-edge/15 px-4 text-sm font-semibold transition hover:border-edge/35"
            >
              <Phone className="size-4 text-accent" /> {SITE.phone}
            </a>
            <a
              href={whatsappTo(settings.whatsappNumber, `Hi ${SITE.name}!`)}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-coal transition hover:brightness-110"
            >
              <WhatsAppIcon className="size-4" /> WhatsApp chat
            </a>
          </div>
        </div>

        <nav className="lg:col-span-2" aria-label="Menu categories">
          <p className="font-mono text-xs tracking-widest text-cream/40 uppercase">Menu</p>
          <ul className="mt-5 space-y-2.5">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuCategory(c.id);
                    scrollTo("menu-list", -150);
                  }}
                  className="text-cream/70 transition hover:text-accent"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-2 lg:col-span-4">
          <div className="relative overflow-hidden rounded-[28px] border border-edge/10 bg-gradient-to-br from-ink-800 to-ink-900 p-7">
            <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand/20 blur-3xl" />
            <p className="flex items-center gap-2 font-mono text-xs text-veg light:text-green-700">
              <span className="size-2 animate-pulse rounded-full bg-veg" /> available for freelance
            </p>
            <h3 className="mt-4 font-display text-2xl leading-tight font-bold">Like how this site feels?</h3>
            <p className="mt-2 text-sm text-cream/60">{DEVELOPER.pitch}</p>
            <a
              href={DEVELOPER.url}
              target="_blank"
              rel="noreferrer"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-brand hover:text-coal"
            >
              <GitHubIcon className="size-4" />
              Work with {DEVELOPER.firstName}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="relative mt-16 overflow-hidden select-none" aria-hidden>
        <motion.p
          style={{ y: wordY }}
          className="bg-gradient-to-b from-cream/15 to-cream/0 bg-clip-text text-center font-display text-[15.5vw] leading-[0.8] font-extrabold tracking-[-0.04em] whitespace-nowrap text-transparent"
        >
          Techie's Taste
        </motion.p>
      </div>

      <div className="border-t border-edge/10">
        <div className="container-x flex flex-col gap-4 pt-6 pb-28 text-xs text-cream/45 md:flex-row md:items-center md:justify-between md:pb-6">
          <p>
            © {new Date().getFullYear()} {SITE.name} · Designed & developed by{" "}
            <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="text-cream/80 underline-offset-4 hover:text-accent hover:underline">
              {DEVELOPER.name}
            </a>
          </p>
          <p className="max-w-xl md:text-right">
            Food photos from Pexels.{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Spicy_egg_bhurji_@_the_eggfactory.jpg"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-cream"
            >
              "Spicy egg bhurji @ the eggfactory"
            </a>{" "}
            by Praveen (h0lydevil),{" "}
            <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-cream">
              CC BY 2.0
            </a>
            , via Wikimedia Commons. Cropped and resized.
          </p>
          <button
            type="button"
            onClick={() => scrollTo("top")}
            className="group flex items-center gap-2 self-start font-mono text-cream/70 hover:text-accent md:self-auto"
          >
            Back to top
            <span className="grid size-8 place-items-center rounded-full border border-edge/15 transition group-hover:-translate-y-1 group-hover:border-brand">
              <ArrowUp className="size-4" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
