import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ban, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { isValidMobile, normalizeMobile } from "../lib/orders";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/primitives";
import { blockUser, type OrderStatus } from "./api";

export const inputClass =
  "h-11 w-full rounded-xl border border-edge/15 bg-ink-950 px-3.5 text-[15px] outline-none transition placeholder:text-cream/30 focus:border-brand";

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-cream/45">{hint}</span>}
    </label>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 disabled:opacity-40", on ? "bg-veg" : "bg-edge/20")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className={cn("size-6 rounded-full bg-white shadow", on && "ml-auto")} />
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className="pointer-events-none fixed inset-0 z-[71] flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn(
                "pointer-events-auto flex max-h-[92svh] w-full flex-col rounded-t-[28px] border border-edge/10 bg-ink-900 shadow-2xl sm:rounded-[28px]",
                wide ? "sm:max-w-2xl" : "sm:max-w-lg",
              )}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <header className="flex items-center justify-between gap-4 border-b border-edge/10 px-5 py-4 sm:px-6">
                <h2 className="font-display text-xl font-bold">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full border border-edge/10 hover:border-edge/30">
                  <X className="size-5" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
              {footer && <footer className="flex gap-3 border-t border-edge/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</footer>}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  New: "bg-brand text-coal",
  Preparing: "bg-sky-500/15 text-sky-300 light:text-sky-700",
  Ready: "bg-violet-500/15 text-violet-300 light:text-violet-700",
  Delivered: "bg-veg/15 text-veg light:text-green-700",
  Cancelled: "bg-chili/15 text-chili light:text-red-700",
};

export function StatusPill({ status, label }: { status: OrderStatus; label?: string }) {
  return <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-xs font-bold", STATUS_STYLE[status])}>{label ?? status}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-3xl border border-edge/10 bg-ink-900 p-5">
      <p className="font-mono text-[11px] tracking-widest text-cream/45 uppercase">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-cream/45">{hint}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: typeof Ban; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-edge/15 px-6 py-14 text-center">
      <Icon className="mx-auto size-9 text-accent" />
      <p className="mt-4 font-display text-xl font-bold">{title}</p>
      {children && <div className="mt-2 text-sm text-cream/55">{children}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-5 animate-spin", className)} />;
}

export function timeAgo(date: Date | null, now = Date.now()) {
  if (!date) return "just now";
  const mins = Math.round((now - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const timeOf = (date: Date | null) => (date ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

/** Block dialog used from orders ("Block this user") and the Blocked Users tab. */
export function BlockDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: { mobile: string; name: string } }) {
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMobile(initial?.mobile ?? "");
      setName(initial?.name ?? "");
      setReason("");
    }
  }, [open, initial]);

  const normalized = normalizeMobile(mobile);
  const valid = isValidMobile(normalized);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await blockUser(normalized, name, reason || "Fake / prank order");
      toast.success(`${normalized} is blocked`, { description: "They can't place orders until you unblock them." });
      onClose();
    } catch (e) {
      toast.error("Couldn't block this number", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Block a mobile number"
      footer={
        <>
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 bg-chili text-coal hover:bg-chili/90" disabled={!valid || busy} onClick={submit}>
            {busy ? <Spinner /> : <Ban className="size-4" />} Block
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mobile number" hint={mobile && !valid ? "Enter a valid 10-digit Indian mobile number" : undefined}>
          <input className={inputClass} inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" />
        </Field>
        <Field label="Name (optional)">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="As given on the order" />
        </Field>
        <Field label="Reason">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fake / prank order" />
        </Field>
        <p className="text-sm text-cream/55">Blocked numbers can't place any order until you unblock them. This is enforced by the database rules, not just the website.</p>
      </div>
    </Modal>
  );
}
