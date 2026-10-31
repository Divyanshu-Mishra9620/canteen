import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "../data/menu";
import { isValidMobile, normalizeMobile } from "../lib/orders";
import { cn, rupee } from "../lib/utils";
import { Button } from "../components/ui/primitives";
import { saveSettings } from "./api";
import { Field, Spinner, Switch, inputClass } from "./ui";

export function OpenToggle({ settings, compact }: { settings: Settings; compact?: boolean }) {
  // Always write the full object: the order rule reads every field, so the doc must never be partial.
  const toggle = (isOpen: boolean) =>
    saveSettings({ ...settings, isOpen }).then(
      () => toast.success(isOpen ? "Canteen is open: ordering is on" : "Canteen is closed: customers can browse but not order"),
      (e) => toast.error("Couldn't change status", { description: (e as Error).message }),
    );

  if (compact) {
    return (
      <label className={cn("flex h-10 items-center gap-2 rounded-full px-3 text-xs font-bold", settings.isOpen ? "bg-veg/15 text-veg light:text-green-700" : "bg-chili/15 text-chili light:text-red-700")}>
        <Switch on={settings.isOpen} onChange={toggle} label="Canteen open" />
        <span className="hidden sm:inline">{settings.isOpen ? "Open" : "Closed"}</span>
      </label>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 rounded-3xl border p-5", settings.isOpen ? "border-veg/30 bg-veg/[0.06]" : "border-chili/30 bg-chili/[0.06]")}>
      <Store className={cn("size-7 shrink-0", settings.isOpen ? "text-veg" : "text-chili")} />
      <div className="flex-1">
        <p className="font-display text-xl font-bold">{settings.isOpen ? "Open: taking orders" : "Closed: ordering paused"}</p>
        <p className="text-sm text-cream/55">When closed, customers can still browse the menu but can't place orders.</p>
      </div>
      <Switch on={settings.isOpen} onChange={toggle} label="Canteen open" />
    </div>
  );
}

export function SettingsTab({ settings }: { settings: Settings }) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  const whatsapp = normalizeMobile(form.whatsappNumber);
  const valid = form.deliveryCharge >= 0 && form.freeDeliveryThreshold >= 0 && isValidMobile(whatsapp);
  const dirty =
    form.deliveryCharge !== settings.deliveryCharge ||
    form.freeDeliveryThreshold !== settings.freeDeliveryThreshold ||
    whatsapp !== settings.whatsappNumber;

  const save = async () => {
    setBusy(true);
    try {
      await saveSettings({
        ...settings,
        deliveryCharge: Math.round(form.deliveryCharge),
        freeDeliveryThreshold: Math.round(form.freeDeliveryThreshold),
        whatsappNumber: whatsapp,
      });
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Couldn't save settings", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <OpenToggle settings={settings} />

      <div className="rounded-3xl border border-edge/10 bg-ink-900 p-5 sm:p-6">
        <h3 className="font-display text-xl font-bold">Delivery & contact</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Delivery charge (₹)">
            <input className={inputClass} type="number" min={0} inputMode="numeric" value={form.deliveryCharge} onChange={(e) => setForm({ ...form, deliveryCharge: Number(e.target.value) })} />
          </Field>
          <Field label="Free delivery from (₹)">
            <input className={inputClass} type="number" min={0} inputMode="numeric" value={form.freeDeliveryThreshold} onChange={(e) => setForm({ ...form, freeDeliveryThreshold: Number(e.target.value) })} />
          </Field>
          <Field label="Owner WhatsApp number" className="sm:col-span-2" hint={form.whatsappNumber && !isValidMobile(whatsapp) ? "Enter a valid 10-digit mobile number" : "Orders are sent to this number."}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-cream/45">+91</span>
              <input className={cn(inputClass, "pl-12")} inputMode="numeric" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
            </div>
          </Field>
        </div>
        <p className="mt-4 rounded-2xl bg-edge/[0.04] p-3 text-sm text-cream/60">
          Orders below {rupee(form.freeDeliveryThreshold)} pay {rupee(form.deliveryCharge)} delivery. Orders of {rupee(form.freeDeliveryThreshold)} or more get free delivery.
        </p>
        <Button className="mt-5 w-full sm:w-auto" disabled={!valid || !dirty || busy} onClick={save}>
          {busy && <Spinner />} Save settings
        </Button>
      </div>
    </div>
  );
}
