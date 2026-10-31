import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, LoaderCircle, MapPin, Phone, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { HOSTELS, SITE } from "../data/site";
import { useStore } from "../context/store";
import { LOCATION_MAX_AGE_MS, checkLocation, formatDistance, type LocationCheck } from "../lib/location";
import {
  OrderError,
  draftOrder,
  isKnownHostel,
  isValidMobile,
  loadCustomer,
  normalizeMobile,
  orderMessage,
  placeOrder,
  saveCustomer,
  whatsappTo,
  type CustomerDetails,
  type PlacedOrder,
} from "../lib/orders";
import { cn, rupee } from "../lib/utils";
import { WhatsAppIcon } from "./ui/icons";
import { AddToTray, Button, FoodImage, VegMark } from "./ui/primitives";

type Step = "cart" | "details" | "done";
type Errors = Partial<Record<keyof CustomerDetails, string>>;

const EASE = [0.16, 1, 0.3, 1] as const;

function validate(d: CustomerDetails): Errors {
  const errors: Errors = {};
  if (d.name.trim().length < 2) errors.name = "Please enter your name";
  if (!isValidMobile(normalizeMobile(d.mobile))) errors.mobile = "Enter a valid 10-digit mobile number";
  if (!isKnownHostel(d.hostel)) errors.hostel = "Select your hostel";
  if (!d.room.trim()) errors.room = "Room number is required";
  return errors;
}

const RADIUS = formatDistance(SITE.deliveryRadiusM);

/** Compulsory location step: explains each outcome and how to fix it. */
function LocationPanel({ geo, onRetry }: { geo: LocationCheck; onRetry: () => void }) {
  const busy = geo.status === "idle" || geo.status === "locating";
  const ok = geo.status === "ok";
  const info: { title: string; body: string } = (() => {
    switch (geo.status) {
      case "ok":
        return { title: `You're ${formatDistance(geo.location.distance)} from the canteen`, body: `Inside the ${RADIUS} delivery area.` };
      case "far":
        return { title: `You're ${formatDistance(geo.distance)} away`, body: `We take orders only within ${RADIUS} of the canteen.` };
      case "imprecise":
        return { title: `Your location isn't precise enough (±${formatDistance(geo.accuracy)})`, body: "Turn on GPS / “Precise location” for your browser, then check again." };
      case "denied":
        return {
          title: "Location access is blocked",
          body: "Location is required to order. Tap the lock icon next to the website address → Permissions → Location → Allow, then check again.",
        };
      case "unavailable":
        return geo.reason === "insecure"
          ? { title: "Location needs a secure connection", body: "Open the website using its https:// address." }
          : geo.reason === "unsupported"
            ? { title: "This browser can't share location", body: "Open the site in Chrome or Safari on your phone." }
            : { title: "Couldn't get your location", body: "Turn on Location / GPS in your phone settings, then check again." };
      default:
        return { title: "Checking your location…", body: `Location access is required. We deliver only within ${RADIUS} of the canteen.` };
    }
  })();

  return (
    <div
      id="location-panel"
      className={cn(
        "rounded-2xl border p-4 text-sm",
        ok ? "border-veg/30 bg-veg/10" : busy ? "border-edge/15 bg-edge/[0.03]" : "border-chili/40 bg-chili/10",
      )}
    >
      <p className="mb-2 text-xs font-semibold tracking-wide text-cream/50 uppercase">Your location (required)</p>
      <div className="flex gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", ok ? "bg-veg text-coal" : busy ? "bg-edge/10" : "bg-chili text-coal")}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : ok ? <Check className="size-4" strokeWidth={3} /> : <MapPin className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{info.title}</p>
          <p className="mt-0.5 text-cream/60">{info.body}</p>
          {!busy && !ok && (
            <button type="button" onClick={onRetry} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-cream px-4 text-xs font-bold text-ink-950">
              <MapPin className="size-3.5" /> Check my location again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Free-delivery nudge with a progress bar. */
export function DeliveryProgress({ compact }: { compact?: boolean }) {
  const { delivery } = useStore();
  return (
    <div className={cn("rounded-2xl border p-4", delivery.isFree ? "border-veg/30 bg-veg/10" : "border-brand/25 bg-brand/[0.07]")}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Truck className={cn("size-4 shrink-0", delivery.isFree ? "text-veg light:text-green-700" : "text-accent")} />
        {delivery.isFree ? "You've got FREE delivery! 🎉" : `Add ${rupee(delivery.remaining)} more to get FREE delivery 🎉`}
      </p>
      {!compact && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-edge/10">
          <motion.div
            className={cn("h-full rounded-full", delivery.isFree ? "bg-veg" : "bg-brand")}
            initial={false}
            animate={{ width: `${Math.max(4, delivery.progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
}

function Bill({ subtotal, deliveryCharge, normalCharge, grandTotal }: { subtotal: number; deliveryCharge: number; normalCharge: number; grandTotal: number }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-cream/65">
        <dt>Item total</dt>
        <dd className="tabular-nums">{rupee(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-cream/65">
        <dt>Delivery charge</dt>
        <dd>
          {deliveryCharge ? (
            rupee(deliveryCharge)
          ) : (
            <span className="font-semibold text-veg light:text-green-700">
              <s className="mr-1.5 font-normal text-cream/40">{rupee(normalCharge)}</s>FREE
            </span>
          )}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-dashed border-edge/15 pt-2.5 text-base font-bold">
        <dt>Grand total</dt>
        <dd className="font-display text-2xl tabular-nums">{rupee(grandTotal)}</dd>
      </div>
    </dl>
  );
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-chili light:text-red-700">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-cream/45">{hint}</span>
      )}
    </label>
  );
}

const inputClass = (error?: string) =>
  cn(
    "h-12 w-full rounded-xl border bg-ink-950 px-3.5 text-[15px] outline-none transition placeholder:text-cream/30 focus:border-brand",
    error ? "border-chili/70" : "border-edge/15",
  );

export function CartDrawer() {
  const { cartOpen, setCartOpen, items, subtotal, delivery, grandTotal, count, setQty, clear, scrollTo, settings, menuSource } = useStore();
  const [step, setStep] = useState<Step>("cart");
  const [details, setDetails] = useState<CustomerDetails>(loadCustomer);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<OrderError | null>(null);
  const [placed, setPlaced] = useState<{ order: PlacedOrder; saved: boolean } | null>(null);
  const [geo, setGeo] = useState<LocationCheck>({ status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const locate = useCallback(async () => {
    setGeo({ status: "locating" });
    const result = await checkLocation();
    setGeo(result);
    return result;
  }, []);

  // Location is compulsory: ask as soon as the customer reaches checkout (and refresh stale fixes).
  useEffect(() => {
    if (!cartOpen || step !== "details") return;
    if (geo.status === "idle" || (geo.status === "ok" && Date.now() - geo.at > LOCATION_MAX_AGE_MS)) void locate();
  }, [cartOpen, step]); // intentionally not on `geo`: only re-ask when the step opens

  // The error banner sits below the form; bring it on screen so it can't be missed.
  useEffect(() => {
    if (failure) alertRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [failure]);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, setCartOpen]);

  // An emptied cart can't be on the details step.
  useEffect(() => {
    if (step === "details" && items.length === 0) setStep("cart");
  }, [step, items.length]);

  const unavailable = items.filter(({ item }) => !item.isAvailable);
  const lines = items.map(({ item, qty }) => ({ id: item.id, name: item.name, price: item.price, qty, isVeg: item.isVeg }));

  const finish = () => {
    setCartOpen(false);
    setTimeout(() => {
      setStep("cart");
      setPlaced(null);
    }, 400);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(details);
    setErrors(errs);
    if (Object.keys(errs).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    if (!settings.isOpen) {
      setFailure(new OrderError("closed", "The canteen is closed right now. You can browse, but ordering is paused."));
      return;
    }
    const customer = {
      name: details.name.trim(),
      mobile: normalizeMobile(details.mobile),
      hostel: details.hostel,
      room: details.room.trim(),
    };
    saveCustomer(customer);
    setBusy(true);
    setFailure(null);
    try {
      // Orders are only taken within the delivery radius, using a fresh location fix.
      let fix = geo;
      if (fix.status !== "ok" || Date.now() - fix.at > LOCATION_MAX_AGE_MS) fix = await locate();
      if (fix.status !== "ok") {
        document.getElementById("location-panel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      const result = await placeOrder({
        customer,
        note,
        lines,
        location: fix.location,
        bumpCounts: menuSource === "firestore",
      });
      setPlaced(result);
      setNote("");
      clear();
      setStep("done");
    } catch (err) {
      setFailure(err instanceof OrderError ? err : new OrderError("network", "Couldn't place the order. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const title = step === "cart" ? "Your cart" : step === "details" ? "Delivery details" : "Order placed!";

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => (step === "done" ? finish() : setCartOpen(false))}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col overflow-hidden border-edge/10 bg-ink-900 shadow-2xl sm:inset-y-2 sm:right-2 sm:w-[calc(100%-1rem)] sm:rounded-[28px] sm:border"
            initial={{ x: "110%" }}
            animate={{ x: 0 }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center gap-3 border-b border-edge/10 px-5 py-4 sm:px-6">
              {step === "details" && (
                <button type="button" onClick={() => setStep("cart")} aria-label="Back to cart" className="grid size-10 place-items-center rounded-full border border-edge/10 hover:border-edge/30">
                  <ArrowLeft className="size-5" />
                </button>
              )}
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold">{title}</h2>
                {step !== "done" && (
                  <p className="text-sm text-cream/50">
                    {count} {count === 1 ? "item" : "items"} · {rupee(grandTotal)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => (step === "done" ? finish() : setCartOpen(false))}
                aria-label="Close cart"
                className="grid size-10 place-items-center rounded-full border border-edge/10 transition hover:rotate-90 hover:border-edge/30"
              >
                <X className="size-5" />
              </button>
            </header>

            <AnimatePresence mode="wait" initial={false}>
              {step === "done" && placed ? (
                <Success key="done" placed={placed} whatsappNumber={settings.whatsappNumber} normalCharge={settings.deliveryCharge} onDone={finish} />
              ) : items.length === 0 ? (
                <motion.div key="empty" className="flex flex-1 flex-col items-center justify-center px-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div
                    initial={{ rotate: -12, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="grid size-24 place-items-center rounded-full bg-brand/10"
                  >
                    <ShoppingBag className="size-10 text-accent" />
                  </motion.div>
                  <p className="mt-6 font-display text-2xl font-bold">Your cart is empty</p>
                  <p className="mt-2 text-sm text-cream/50">Hunger is a bug. Let's fix it.</p>
                  <Button
                    className="mt-8"
                    onClick={() => {
                      setCartOpen(false);
                      scrollTo("menu");
                    }}
                  >
                    Browse the menu
                  </Button>
                </motion.div>
              ) : step === "cart" ? (
                <motion.div key="cart" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3, ease: EASE }}>
                  <div data-lenis-prevent className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    {!settings.isOpen && (
                      <p className="flex gap-2 rounded-2xl border border-chili/30 bg-chili/10 p-3 text-sm">
                        <AlertTriangle className="size-4 shrink-0 text-chili" />
                        The canteen is closed right now. You can browse, but ordering is paused.
                      </p>
                    )}
                    <DeliveryProgress />
                    <p className="flex gap-2 rounded-2xl border border-edge/10 bg-edge/[0.03] p-3 text-sm text-cream/70">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span>
                        We take orders only within <strong className="text-cream">{RADIUS} of the canteen</strong>. Location access is required at checkout.
                      </span>
                    </p>
                    <ul className="space-y-3">
                      <AnimatePresence initial={false}>
                        {items.map(({ item, qty }) => (
                          <motion.li
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40, height: 0, marginTop: 0 }}
                            className={cn("flex gap-3.5 rounded-2xl border border-edge/[0.07] bg-edge/[0.02] p-3", !item.isAvailable && "border-chili/30")}
                          >
                            <FoodImage src={item.imageUrl} alt={item.name} category={item.category} className={cn("size-20 shrink-0 rounded-xl", !item.isAvailable && "grayscale")} />
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                              <div className="flex items-start gap-2">
                                <VegMark veg={item.isVeg} className="mt-0.5" />
                                <p className="flex-1 leading-tight font-semibold">{item.name}</p>
                                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setQty(item.id, 0)} className="text-cream/35 transition hover:text-chili">
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-display text-lg font-bold text-accent">{rupee(item.price * qty)}</span>
                                {item.isAvailable ? (
                                  <AddToTray id={item.id} tone="glass" className="h-9" />
                                ) : (
                                  <span className="text-xs font-semibold text-chili light:text-red-700">Out of stock, please remove</span>
                                )}
                              </div>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                    <div className="rounded-2xl border border-edge/10 p-4">
                      <Bill subtotal={subtotal} deliveryCharge={delivery.charge} normalCharge={settings.deliveryCharge} grandTotal={grandTotal} />
                    </div>
                    <button type="button" onClick={clear} className="mx-auto block text-sm text-cream/45 underline-offset-4 hover:text-chili hover:underline">
                      Clear cart
                    </button>
                  </div>
                  <footer className="border-t border-edge/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                    <Button size="lg" className="w-full justify-between" disabled={unavailable.length > 0} onClick={() => setStep("details")}>
                      <span>{unavailable.length ? "Remove out-of-stock items" : "Proceed to checkout"}</span>
                      <span className="flex items-center gap-2">
                        {rupee(grandTotal)} <ArrowRight className="size-5" />
                      </span>
                    </Button>
                  </footer>
                </motion.div>
              ) : (
                <motion.form
                  key="details"
                  ref={formRef}
                  noValidate
                  onSubmit={submit}
                  className="flex min-h-0 flex-1 flex-col"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div data-lenis-prevent className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    <LocationPanel geo={geo} onRetry={() => void locate()} />
                    <Field label="Name" error={errors.name}>
                      <input
                        name="name"
                        autoComplete="name"
                        value={details.name}
                        onChange={(e) => setDetails({ ...details, name: e.target.value })}
                        className={inputClass(errors.name)}
                        placeholder="Your full name"
                        maxLength={60}
                      />
                    </Field>
                    <Field label="Mobile number" error={errors.mobile} hint="We'll call this number if we can't find your room.">
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-cream/45">+91</span>
                        <input
                          name="mobile"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={details.mobile}
                          // Room for pasted "+91 98765 43210"; validation normalises to the bare 10 digits.
                          onChange={(e) => setDetails({ ...details, mobile: e.target.value.replace(/[^\d\s+-]/g, "").slice(0, 18) })}
                          // The +91 prefix is drawn by the field, so tidy "+91 98765 43210" to "98765 43210".
                          onBlur={() => {
                            const n = normalizeMobile(details.mobile);
                            if (isValidMobile(n)) setDetails({ ...details, mobile: `${n.slice(0, 5)} ${n.slice(5)}` });
                          }}
                          className={cn(inputClass(errors.mobile), "pl-12 tabular-nums")}
                          placeholder="98765 43210"
                        />
                      </div>
                    </Field>
                    <div className="grid grid-cols-[1fr_7.5rem] gap-3">
                      <Field label="Hostel" error={errors.hostel}>
                        <div className="relative">
                          <select
                            name="hostel"
                            value={details.hostel}
                            onChange={(e) => setDetails({ ...details, hostel: e.target.value })}
                            className={cn(inputClass(errors.hostel), "appearance-none pr-10", !details.hostel && "text-cream/40")}
                          >
                            <option value="" disabled>
                              Select hostel
                            </option>
                            {HOSTELS.map((h) => (
                              <option key={h} value={h} className="text-cream">
                                {h}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-cream/45" />
                        </div>
                      </Field>
                      <Field label="Room no." error={errors.room}>
                        <input
                          name="room"
                          value={details.room}
                          onChange={(e) => setDetails({ ...details, room: e.target.value })}
                          className={inputClass(errors.room)}
                          placeholder="214"
                          maxLength={20}
                        />
                      </Field>
                    </div>
                    <Field label="Cooking instructions (optional)" hint={`${note.length}/200`}>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 200))}
                        rows={2}
                        className={cn(inputClass(), "h-auto resize-none py-3")}
                        placeholder="Less spicy, extra chutney…"
                      />
                    </Field>

                    <DeliveryProgress compact />
                    <div className="rounded-2xl border border-edge/10 p-4">
                      <Bill subtotal={subtotal} deliveryCharge={delivery.charge} normalCharge={settings.deliveryCharge} grandTotal={grandTotal} />
                    </div>

                    <AnimatePresence>
                      {failure && (
                        <motion.div
                          ref={alertRef}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          role="alert"
                          className="rounded-2xl border border-chili/40 bg-chili/10 p-4 text-sm"
                        >
                          <p className="flex gap-2 font-semibold">
                            <AlertTriangle className="size-4 shrink-0 text-chili" />
                            {failure.message}
                          </p>
                          {failure.code === "blocked" && (
                            <a href={`tel:+91${SITE.phone}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-chili px-4 py-2 font-semibold text-coal">
                              <Phone className="size-4" /> Call {SITE.phone}
                            </a>
                          )}
                          {(failure.code === "setup" || failure.code === "network") && (
                            <a
                              href={whatsappTo(
                                settings.whatsappNumber,
                                orderMessage(
                                  draftOrder(
                                    {
                                      customer: { ...details, mobile: normalizeMobile(details.mobile) },
                                      note,
                                      lines,
                                      location: geo.status === "ok" ? geo.location : null,
                                    },
                                    settings,
                                  ),
                                ),
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 font-semibold text-coal"
                            >
                              <WhatsAppIcon className="size-4" /> Order on WhatsApp
                            </a>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <footer className="border-t border-edge/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                    <Button type="submit" size="lg" className="w-full justify-between" disabled={busy}>
                      <span className="flex items-center gap-2">
                        {busy && <LoaderCircle className="size-5 animate-spin" />}
                        {busy ? "Placing order…" : "Place order"}
                      </span>
                      <span>{rupee(grandTotal)}</span>
                    </Button>
                    <p className="mt-2 text-center text-xs text-cream/45">Pay on delivery · Cash or UPI</p>
                  </footer>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Success({
  placed,
  whatsappNumber,
  normalCharge,
  onDone,
}: {
  placed: { order: PlacedOrder; saved: boolean };
  whatsappNumber: string;
  normalCharge: number;
  onDone: () => void;
}) {
  const { order, saved } = placed;
  return (
    <motion.div className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE }}>
      <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-5">
        <div className="flex flex-col items-center text-center">
          <motion.span
            className="grid size-20 place-items-center rounded-full bg-veg text-coal"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          >
            <Check className="size-10" strokeWidth={3} />
          </motion.span>
          <p className="mt-5 font-mono text-xs tracking-widest text-cream/50 uppercase">Order ID</p>
          <p className="mt-1 font-display text-3xl font-extrabold tracking-wide text-accent">{order.orderId}</p>
          <p className="mt-3 max-w-xs text-sm text-cream/60">
            {saved
              ? "The canteen has your order. Tap below to also send it on WhatsApp so they can confirm faster."
              : "Demo mode: this order wasn't saved because Firebase isn't connected yet. Send it on WhatsApp to place it."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-edge/10 p-4 text-sm">
          <p className="font-semibold">
            {order.customer.name} · {order.customer.mobile}
          </p>
          <p className="text-cream/55">
            {order.customer.hostel}, Room {order.customer.room}
          </p>
          <ul className="my-3 space-y-1.5 border-y border-dashed border-edge/15 py-3">
            {order.items.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span>
                  <span className="text-cream/50">{l.qty} ×</span> {l.name}
                </span>
                <span className="tabular-nums">{rupee(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <Bill subtotal={order.subtotal} deliveryCharge={order.deliveryCharge} normalCharge={normalCharge} grandTotal={order.grandTotal} />
          {order.note && <p className="mt-3 text-cream/55">📝 {order.note}</p>}
        </div>
      </div>
      <footer className="space-y-2 border-t border-edge/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
        <a
          href={whatsappTo(whatsappNumber, orderMessage(order))}
          target="_blank"
          rel="noreferrer"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-coal transition hover:brightness-110"
        >
          <WhatsAppIcon className="size-5" />
          Send Order on WhatsApp
        </a>
        <Button variant="ghost" className="w-full" onClick={onDone}>
          Done
        </Button>
      </footer>
    </motion.div>
  );
}

/** Mobile-only sticky "View Cart" bar. */
export function CartBar() {
  const { count, subtotal, delivery, cartOpen, setCartOpen, filtersOpen, paletteOpen } = useStore();
  const show = count > 0 && !cartOpen && !filtersOpen && !paletteOpen;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          exit={{ y: 120 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex h-16 w-full items-center justify-between rounded-2xl bg-brand px-4 text-coal shadow-2xl shadow-black/40 light:shadow-black/15"
          >
            <span className="text-left">
              <span className="block text-xs font-semibold opacity-70">
                {count} {count === 1 ? "item" : "items"} · {delivery.isFree ? "FREE delivery" : `${rupee(delivery.remaining)} away from free delivery`}
              </span>
              <motion.span key={subtotal} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="block font-display text-xl font-extrabold">
                {rupee(subtotal)}
              </motion.span>
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              View Cart <ArrowRight className="size-5" />
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
