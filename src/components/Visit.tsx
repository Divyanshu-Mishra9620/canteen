import { motion } from "motion/react";
import { ArrowUpRight, Clock3, MapPin, Sparkle } from "lucide-react";
import { SITE, mapsLink } from "../data/site";
import { useStore } from "../context/store";
import { useOpenStatus } from "../hooks";
import { whatsappTo } from "../lib/orders";
import { cn, formatHour } from "../lib/utils";
import { WhatsAppIcon } from "./ui/icons";
import { Button, Eyebrow, Magnetic, RevealText, RotatingBadge, buttonClass } from "./ui/primitives";

const COLLAGE = [
  { src: "/images/momos.jpg", alt: "Steamed momos", className: "left-0 top-10 -rotate-6", hover: { rotate: -10, x: -16 } },
  { src: "/images/parantha.jpg", alt: "Aloo parantha with curd", className: "right-0 top-0 rotate-6", hover: { rotate: 10, x: 16 } },
  { src: "/images/roll.jpg", alt: "Kathi roll", className: "left-1/2 bottom-0 -translate-x-1/2 rotate-1 z-10", hover: { y: -12 } },
];

export function Visit() {
  const { scrollTo, settings } = useStore();
  const { isOpen, countdown } = useOpenStatus();

  return (
    <section id="visit" className="py-16 sm:py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[40px] border border-edge/10 bg-ink-900 px-6 py-14 sm:p-14 lg:p-20">
          <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
          <div className="pointer-events-none absolute -right-40 -bottom-40 size-[560px] rounded-full bg-brand/15 blur-[120px]" />

          <div className="relative grid items-center gap-16 lg:grid-cols-2">
            <div>
              <Eyebrow>visit · order</Eyebrow>
              <h2 className="mt-5 font-display text-6xl leading-[0.9] font-extrabold tracking-tight sm:text-7xl lg:text-8xl">
                <RevealText text="Hungry yet?" highlight={["yet?"]} />
              </h2>
              <p className="mt-6 max-w-md text-lg text-cream/60">Order online for delivery to your hostel room, or drop by between commits.</p>

              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border border-edge/10 bg-ink-950/50 p-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-edge/5">
                    <Clock3 className="size-5 text-accent" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      Open daily · {formatHour(SITE.hours.open)} – {formatHour(SITE.hours.close)}
                    </p>
                    <p className="text-sm text-cream/50">Hostel delivery within {SITE.deliveryRadiusM} m, dine-in & takeaway</p>
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                      isOpen ? "bg-veg/15 text-veg light:text-green-700" : "bg-chili/15 text-chili light:text-red-700",
                    )}
                  >
                    <span className="size-1.5 animate-pulse rounded-full bg-current" />
                    {isOpen ? `Closes in ${countdown}` : `Opens in ${countdown}`}
                  </span>
                </div>
                <a
                  href={mapsLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-edge/10 bg-ink-950/50 p-4 transition hover:border-edge/25"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-edge/5">
                    <MapPin className="size-5 text-accent" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{SITE.address}</p>
                    <p className="text-sm text-cream/50">Open in Google Maps</p>
                  </div>
                  <ArrowUpRight className="size-5 text-cream/40" />
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Magnetic>
                  <a
                    href={whatsappTo(settings.whatsappNumber, `Hi ${SITE.name}! I'd like to place an order.`)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass({ size: "lg" })}
                  >
                    <WhatsAppIcon className="size-5" />
                    Order on WhatsApp
                  </a>
                </Magnetic>
                <Button size="lg" variant="ghost" onClick={() => scrollTo("menu")}>
                  Order online
                </Button>
              </div>
            </div>

            <div className="relative mx-auto h-[420px] w-full max-w-[460px] sm:h-[480px]">
              {COLLAGE.map((photo) => (
                <motion.img
                  key={photo.src}
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  whileHover={{ ...photo.hover, scale: 1.04, zIndex: 20 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={cn(
                    "absolute aspect-[4/5] w-[52%] rounded-3xl border-4 border-ink-900 object-cover shadow-2xl shadow-black/60 light:shadow-black/20",
                    photo.className,
                  )}
                />
              ))}
              <RotatingBadge
                text="fresh • tasty • affordable • "
                className="absolute top-1/2 left-1/2 z-30 size-28 -translate-x-1/2 -translate-y-[85%] rounded-full bg-brand text-coal shadow-xl"
              >
                <Sparkle className="size-6 fill-coal" />
              </RotatingBadge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
