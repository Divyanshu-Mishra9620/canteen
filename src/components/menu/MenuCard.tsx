import { motion } from "motion/react";
import { Dumbbell, Flame, Sparkles, Star, Timer, type LucideIcon } from "lucide-react";
import { TAG_LABEL, type MenuItem, type Tag } from "../../data/menu";
import { cn, rupee } from "../../lib/utils";
import { AddToTray, FoodImage, VegMark } from "../ui/primitives";

const TAG_STYLE: Record<Tag, { className: string; icon: LucideIcon }> = {
  spicy: { className: "border-chili/40 text-chili light:text-red-700", icon: Flame },
  protein: { className: "border-sky-400/40 text-sky-300 light:text-sky-700", icon: Dumbbell },
  new: { className: "border-veg/40 text-veg light:text-green-700", icon: Sparkles },
};

export function MenuCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const soldOut = !item.isAvailable;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      className={cn(
        "group relative flex gap-4 rounded-3xl border border-edge/10 bg-ink-900 p-3.5 pb-5 transition-colors hover:border-edge/20 sm:p-4 sm:pb-5",
        soldOut && "opacity-60",
      )}
      aria-label={`${item.name}, ${rupee(item.price)}${soldOut ? ", out of stock" : ""}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <VegMark veg={item.isVeg} />
          {item.isRecommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              <Star className="size-3 fill-current" /> Recommended
            </span>
          )}
          {item.tags?.map((tag) => {
            const { className, icon: Icon } = TAG_STYLE[tag] ?? TAG_STYLE.new;
            return (
              <span key={tag} className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", className)}>
                <Icon className="size-3" />
                {TAG_LABEL[tag]}
              </span>
            );
          })}
        </div>

        <h4 className="mt-2 font-display text-lg leading-tight font-semibold sm:text-xl">{item.name}</h4>

        <div className="mt-1 flex items-center gap-3">
          <span className="font-display text-lg font-bold text-accent">{rupee(item.price)}</span>
          <span className="flex items-center gap-1 text-xs text-cream/50">
            <Timer className="size-3.5" /> {item.prepTime} min
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-snug text-cream/55">{item.description}</p>
        {soldOut && <p className="mt-auto pt-2 text-xs font-semibold text-chili light:text-red-700">Out of stock right now</p>}
      </div>

      <div className="relative w-28 shrink-0 self-start sm:w-32">
        <FoodImage
          src={item.imageUrl}
          alt={item.name}
          category={item.category}
          className={cn("aspect-square w-full rounded-2xl", soldOut && "grayscale")}
        />
        <div className="absolute inset-x-0 -bottom-3 flex justify-center">
          <AddToTray id={item.id} label="ADD" className="h-9 text-[13px] tracking-wide" />
        </div>
      </div>
    </motion.article>
  );
}

export function MenuCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-3xl border border-edge/10 bg-ink-900 p-4" aria-hidden>
      <div className="flex-1 space-y-3 py-1">
        <div className="skeleton h-4 w-24 rounded-full" />
        <div className="skeleton h-5 w-3/4 rounded-full" />
        <div className="skeleton h-4 w-1/3 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
      </div>
      <div className="skeleton aspect-square w-28 shrink-0 rounded-2xl sm:w-32" />
    </div>
  );
}
