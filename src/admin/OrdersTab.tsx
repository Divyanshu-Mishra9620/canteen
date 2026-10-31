import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ban, ChefHat, MapPin, Phone, Search, Soup, X } from "lucide-react";
import { toast } from "sonner";
import { SITE } from "../data/site";
import { formatDistance, mapLinkFor } from "../lib/location";
import { whatsappTo } from "../lib/orders";
import { cn, rupee } from "../lib/utils";
import { WhatsAppIcon } from "../components/ui/icons";
import { VegMark } from "../components/ui/primitives";
import { ACTIVE_STATUSES, NEXT_STATUS, STATUS_LABEL, setOrderStatus, type AdminOrder, type OrderStatus } from "./api";
import { BlockDialog, Empty, Stat, StatusPill, inputClass, timeAgo, timeOf } from "./ui";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const customerMessage = (o: AdminOrder) =>
  `Hi ${o.customer.name}! Your ${SITE.name} order ${o.orderId} (${rupee(o.grandTotal)}) is ${STATUS_LABEL[o.status].toLowerCase()}.`;

function OrderCard({ order, now, onBlock, blocked }: { order: AdminOrder; now: number; onBlock: (o: AdminOrder) => void; blocked: boolean }) {
  const [busy, setBusy] = useState(false);
  const next = NEXT_STATUS[order.status];

  const move = async (status: OrderStatus) => {
    if (status === "Cancelled" && !window.confirm(`Cancel order ${order.orderId}?`)) return;
    setBusy(true);
    try {
      await setOrderStatus(order.orderId, status);
    } catch (e) {
      toast.error("Couldn't update the order", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={cn("flex flex-col rounded-3xl border bg-ink-900 p-5", order.status === "New" ? "border-brand/60 shadow-[0_0_0_4px] shadow-brand/10" : "border-edge/10")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-extrabold tracking-wide">{order.orderId}</p>
          <p className="text-xs text-cream/50">
            {timeOf(order.createdAt)} · {timeAgo(order.createdAt, now)}
          </p>
        </div>
        <StatusPill status={order.status} label={STATUS_LABEL[order.status]} />
      </div>

      <div className="mt-4 rounded-2xl bg-edge/[0.04] p-3.5 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          {order.customer.name}
          {blocked && <span className="rounded-full bg-chili/15 px-2 py-0.5 text-[10px] font-bold text-chili uppercase">blocked</span>}
        </p>
        <p className="text-cream/60">
          {order.customer.mobile} · {order.customer.hostel}, Room {order.customer.room}
        </p>
        {order.location && (
          <a
            href={mapLinkFor(order.location)}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline"
          >
            <MapPin className="size-3.5" />
            {formatDistance(order.location.distance)} from canteen (±{formatDistance(order.location.accuracy)}) · Open map
          </a>
        )}
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {order.items.map((l) => (
          <li key={l.id} className="flex items-center gap-2">
            <VegMark veg={l.isVeg} className="size-3.5" />
            <span className="font-semibold tabular-nums">{l.qty}×</span>
            <span className="flex-1">{l.name}</span>
            <span className="text-cream/60 tabular-nums">{rupee(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-3 rounded-xl border border-brand/25 bg-brand/[0.07] px-3 py-2 text-sm">📝 {order.note}</p>}

      <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-edge/15 pt-3 text-sm">
        <span className="text-cream/55">
          Items {rupee(order.subtotal)} · Delivery {order.deliveryCharge ? rupee(order.deliveryCharge) : "FREE"}
        </span>
        <span className="font-display text-2xl font-extrabold">{rupee(order.grandTotal)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={() => move(next.to)}
            className="h-11 flex-1 rounded-full bg-brand px-4 text-sm font-bold text-coal transition hover:bg-brand-300 disabled:opacity-50"
          >
            {next.action}
          </button>
        )}
        {ACTIVE_STATUSES.includes(order.status) && (
          <button type="button" disabled={busy} onClick={() => move("Cancelled")} className="h-11 rounded-full border border-chili/40 px-4 text-sm font-semibold text-chili hover:bg-chili/10">
            Cancel
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <a href={`tel:+91${order.customer.mobile}`} className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-edge/15 text-xs font-semibold hover:border-edge/35">
          <Phone className="size-3.5" /> Call
        </a>
        <a
          href={whatsappTo(order.customer.mobile, customerMessage(order))}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-edge/15 text-xs font-semibold hover:border-[#25D366]"
        >
          <WhatsAppIcon className="size-3.5 text-[#25D366]" /> WhatsApp
        </a>
        <button
          type="button"
          onClick={() => onBlock(order)}
          disabled={blocked}
          className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-edge/15 text-xs font-semibold hover:border-chili hover:text-chili disabled:opacity-40"
        >
          <Ban className="size-3.5" /> {blocked ? "Blocked" : "Block"}
        </button>
      </div>
    </motion.article>
  );
}

type LiveFilter = "active" | "New" | "Preparing" | "Ready";

export function LiveOrdersTab({ orders, loading, blockedSet }: { orders: AdminOrder[]; loading: boolean; blockedSet: Set<string> }) {
  const now = useNow();
  const [filter, setFilter] = useState<LiveFilter>("active");
  const [blockTarget, setBlockTarget] = useState<AdminOrder | null>(null);

  // Kitchen queue: oldest first, so nobody waits longest.
  const active = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)),
    [orders],
  );
  const shown = filter === "active" ? active : active.filter((o) => o.status === filter);
  const counts = { active: active.length, New: 0, Preparing: 0, Ready: 0 } as Record<LiveFilter, number>;
  active.forEach((o) => counts[o.status as LiveFilter]++);

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {(["active", "New", "Preparing", "Ready"] as LiveFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              filter === f ? "bg-brand text-coal" : "bg-edge/[0.05] text-cream/65 hover:text-cream",
            )}
          >
            {f === "active" ? "All active" : f === "Ready" ? "Ready / Out" : f}
            <span className={cn("font-mono text-xs", filter === f ? "text-coal/60" : "text-cream/40")}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-80 rounded-3xl" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Empty icon={ChefHat} title="No active orders">
            New orders appear here instantly, with a sound alert. Keep this tab open.
          </Empty>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((o) => (
                <OrderCard key={o.orderId} order={o} now={now} onBlock={setBlockTarget} blocked={blockedSet.has(o.customer.mobile)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BlockDialog
        open={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        initial={blockTarget ? { mobile: blockTarget.customer.mobile, name: blockTarget.customer.name } : undefined}
      />
    </div>
  );
}

export function HistoryTab({ recent, today, blockedSet }: { recent: AdminOrder[]; today: AdminOrder[]; blockedSet: Set<string> }) {
  const now = useNow();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<AdminOrder | null>(null);

  const counted = today.filter((o) => o.status !== "Cancelled");
  const revenue = counted.reduce((sum, o) => sum + o.grandTotal, 0);
  const delivered = today.filter((o) => o.status === "Delivered").length;
  const cancelled = today.length - counted.length;

  const q = search.trim().toLowerCase();
  const list = q
    ? recent.filter((o) => [o.orderId, o.customer.name, o.customer.mobile, o.customer.hostel].some((v) => v.toLowerCase().includes(q)))
    : recent;

  // Group by calendar day.
  const groups = useMemo(() => {
    const map = new Map<string, AdminOrder[]>();
    for (const o of list) {
      const key = o.createdAt ? o.createdAt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Just now";
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return [...map.entries()];
  }, [list]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today's orders" value={counted.length} hint={`${cancelled} cancelled`} />
        <Stat label="Today's revenue" value={rupee(revenue)} hint="Excludes cancelled" />
        <Stat label="Delivered" value={delivered} hint={`${counted.length - delivered} still in progress`} />
        <Stat label="Avg. order" value={counted.length ? rupee(Math.round(revenue / counted.length)) : "—"} />
      </div>

      <div className="relative mt-6">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-cream/40" />
        <input className={cn(inputClass, "pl-10")} placeholder="Search by order ID, name, mobile or hostel" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && (
          <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-edge/10">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-6 space-y-8">
        {groups.length === 0 && (
          <Empty icon={Soup} title={q ? "No orders match" : "No orders yet"}>
            {q ? "Try a different search." : "Orders will show up here once customers start ordering."}
          </Empty>
        )}
        {groups.map(([day, orders]) => (
          <section key={day}>
            <h3 className="mb-3 font-mono text-xs tracking-widest text-cream/45 uppercase">
              {day} · {orders.length} {orders.length === 1 ? "order" : "orders"}
            </h3>
            <ul className="divide-y divide-edge/10 overflow-hidden rounded-3xl border border-edge/10 bg-ink-900">
              {orders.map((o) => (
                <li key={o.orderId}>
                  <button type="button" onClick={() => setOpen(open === o.orderId ? null : o.orderId)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-edge/[0.03]">
                    <span className="w-16 shrink-0 text-xs text-cream/50 tabular-nums">{timeOf(o.createdAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {o.orderId} · {o.customer.name}
                      </span>
                      <span className="block truncate text-xs text-cream/50">
                        {o.itemCount} items · {o.customer.hostel} {o.customer.room}
                      </span>
                    </span>
                    <span className="font-display font-bold tabular-nums">{rupee(o.grandTotal)}</span>
                    <StatusPill status={o.status} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open === o.orderId && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-4 pt-0">
                          <OrderCard order={o} now={now} onBlock={setBlockTarget} blocked={blockedSet.has(o.customer.mobile)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <BlockDialog
        open={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        initial={blockTarget ? { mobile: blockTarget.customer.mobile, name: blockTarget.customer.name } : undefined}
      />
    </div>
  );
}
