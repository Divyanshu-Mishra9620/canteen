import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, DatabaseZap, ImagePlus, Pencil, Plus, Search, Tags, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import type { Category, MenuItem } from "../data/menu";
import { cn, rupee } from "../lib/utils";
import { Button } from "../components/ui/primitives";
import { FoodImage, VegMark } from "../components/ui/primitives";
import {
  addCategory,
  createItem,
  deleteCategory,
  deleteItem,
  importDefaultMenu,
  removeStoredImage,
  updateCategory,
  updateItem,
  uploadItemImage,
} from "./api";
import { Empty, Field, Modal, Spinner, Switch, inputClass } from "./ui";

type Draft = Omit<MenuItem, "id" | "orderCount"> & { id?: string };

const blankDraft = (category: string): Draft => ({
  name: "",
  category,
  price: 50,
  isVeg: true,
  description: "",
  imageUrl: "",
  prepTime: 10,
  isRecommended: false,
  isAvailable: true,
});

const fail = (what: string) => (e: unknown) => toast.error(`Couldn't ${what}`, { description: (e as Error).message });

function ItemEditor({ draft, categories, onClose }: { draft: Draft | null; categories: Category[]; onClose: () => void }) {
  const [d, setD] = useState<Draft | null>(draft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Images uploaded during this edit; deleted again if the edit is abandoned. */
  const uploaded = useRef<string[]>([]);

  useEffect(() => {
    setD(draft);
    uploaded.current = [];
  }, [draft]);

  if (!draft || !d) return null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD({ ...d, [key]: value });
  const valid = d.name.trim().length > 1 && d.price > 0 && d.category;

  const cancel = () => {
    uploaded.current.forEach((url) => void removeStoredImage(url));
    onClose();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadItemImage(file, d.id ?? "new");
      uploaded.current.push(url);
      set("imageUrl", url);
    } catch (e) {
      fail("upload the image")(e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    const { id, ...data } = d;
    const clean = { ...data, name: data.name.trim(), description: data.description.trim(), price: Math.round(data.price), prepTime: Math.round(data.prepTime) };
    try {
      if (id) {
        const previous = draft?.imageUrl;
        await updateItem(id, clean);
        if (previous && previous !== clean.imageUrl) await removeStoredImage(previous);
      } else {
        await createItem(clean);
      }
      // Keep the final image; clean up any intermediate uploads.
      uploaded.current.filter((u) => u !== clean.imageUrl).forEach((u) => void removeStoredImage(u));
      toast.success(id ? "Item updated" : "Item added");
      onClose();
    } catch (e) {
      fail("save the item")(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={cancel}
      title={d.id ? `Edit ${draft?.name}` : "Add menu item"}
      footer={
        <>
          <Button variant="ghost" className="flex-1" onClick={cancel}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!valid || busy || uploading} onClick={save}>
            {busy && <Spinner />} Save item
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <div>
          <FoodImage src={d.imageUrl} alt={d.name || "New item"} category={d.category} className="aspect-square w-full rounded-2xl border border-edge/10" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="mt-2 grid gap-2">
            <Button size="sm" variant="ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Spinner className="size-4" /> : <ImagePlus className="size-4" />}
              {d.imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {d.imageUrl && (
              <Button size="sm" variant="ghost" className="text-chili" onClick={() => set("imageUrl", "")}>
                <Trash2 className="size-4" /> Remove image
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Name">
            <input className={inputClass} value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Cheese Maggi" maxLength={60} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className={inputClass} value={d.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Veg / Non-veg">
              <div className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-edge/[0.05] p-1">
                {[true, false].map((veg) => (
                  <button
                    key={String(veg)}
                    type="button"
                    onClick={() => set("isVeg", veg)}
                    className={cn("flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold", d.isVeg === veg ? "bg-ink-900 shadow" : "text-cream/55")}
                  >
                    <VegMark veg={veg} className="size-3.5" /> {veg ? "Veg" : "Non-veg"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Price (₹)">
              <input className={inputClass} type="number" min={1} inputMode="numeric" value={d.price} onChange={(e) => set("price", Number(e.target.value))} />
            </Field>
            <Field label="Prep time (min)">
              <input className={inputClass} type="number" min={1} inputMode="numeric" value={d.prepTime} onChange={(e) => set("prepTime", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className={cn(inputClass, "h-auto resize-none py-3")} rows={2} maxLength={140} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="One short, tasty line" />
          </Field>
          <Field label="Image URL" hint="Filled automatically when you upload. You can also paste a link or a path like /images/menu/burger.webp">
            <input className={inputClass} value={d.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://… or /images/…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-xl border border-edge/10 p-3">
              <span className="text-sm font-semibold">Available</span>
              <Switch on={d.isAvailable} onChange={(v) => set("isAvailable", v)} label="Available" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-edge/10 p-3">
              <span className="text-sm font-semibold">Recommended</span>
              <Switch on={d.isRecommended} onChange={(v) => set("isRecommended", v)} label="Recommended" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CategoryManager({ open, onClose, categories, menu }: { open: boolean; onClose: () => void; categories: Category[]; menu: MenuItem[] }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addCategory(name, Math.max(0, ...categories.map((c) => c.order)) + 1);
      setName("");
    } catch (e) {
      fail("add the category")(e);
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = categories[index];
    const b = categories[index + dir];
    if (!a || !b) return;
    await Promise.all([updateCategory(a.id, { order: b.order }), updateCategory(b.id, { order: a.order })]).catch(fail("reorder"));
  };

  return (
    <Modal open={open} onClose={onClose} title="Categories" wide>
      <ul className="space-y-3">
        {categories.map((c, i) => {
          const count = menu.filter((m) => m.category === c.id).length;
          return (
            <li key={c.id} className="rounded-2xl border border-edge/10 p-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-6 place-items-center rounded disabled:opacity-25">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === categories.length - 1} onClick={() => move(i, 1)} className="grid size-6 place-items-center rounded disabled:opacity-25">
                    <ArrowDown className="size-4" />
                  </button>
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    defaultValue={c.name}
                    aria-label="Category name"
                    onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && updateCategory(c.id, { name: e.target.value.trim() }).catch(fail("rename"))}
                  />
                  <input
                    className={inputClass}
                    defaultValue={c.tagline}
                    placeholder="Tagline (optional)"
                    aria-label="Category tagline"
                    onBlur={(e) => e.target.value !== c.tagline && updateCategory(c.id, { tagline: e.target.value.trim() }).catch(fail("update"))}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  title={count ? `Move or delete its ${count} items first` : "Delete category"}
                  disabled={count > 0}
                  onClick={() => window.confirm(`Delete category “${c.name}”?`) && deleteCategory(c.id).catch(fail("delete"))}
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-edge/10 text-chili disabled:text-cream/25"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-2 pl-8 text-xs text-cream/45">
                {count} items{count > 0 && " · move or delete them before deleting this category"}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex gap-2">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New category name" />
        <Button onClick={add} disabled={!name.trim() || busy} className="shrink-0">
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </Modal>
  );
}

export function MenuTab({ menu, categories, liveMenu }: { menu: MenuItem[]; categories: Category[]; liveMenu: boolean }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  if (!liveMenu) {
    const doImport = async () => {
      setImporting(true);
      try {
        await importDefaultMenu();
        toast.success("Default menu imported", { description: "32 items, 6 categories and default settings." });
      } catch (e) {
        fail("import the menu")(e);
      } finally {
        setImporting(false);
      }
    };
    return (
      <Empty icon={DatabaseZap} title="Your menu isn't in the database yet">
        <p>Import the default menu (32 items, 6 categories and default settings) to get started. You can edit everything afterwards.</p>
        <Button className="mt-6" onClick={doImport} disabled={importing}>
          {importing && <Spinner />} Import default menu
        </Button>
      </Empty>
    );
  }

  const q = search.trim().toLowerCase();
  const visible = q ? menu.filter((m) => m.name.toLowerCase().includes(q)) : menu;
  const known = new Set(categories.map((c) => c.id));
  const groups = [
    ...categories.map((c) => ({ id: c.id, name: c.name, items: visible.filter((m) => m.category === c.id) })),
    { id: "_none", name: "Uncategorised", items: visible.filter((m) => !known.has(m.category)) },
  ].filter((g) => g.items.length);
  const byPosition = (a: MenuItem, b: MenuItem) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.name.localeCompare(b.name);

  const remove = async (item: MenuItem) => {
    if (!window.confirm(`Delete “${item.name}” from the menu?`)) return;
    await deleteItem(item).then(() => toast.success(`${item.name} deleted`), fail("delete the item"));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-cream/40" />
          <input className={cn(inputClass, "pl-10")} placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="ghost" onClick={() => setCatsOpen(true)}>
          <Tags className="size-4" /> Categories
        </Button>
        <Button onClick={() => setEditing(blankDraft(categories[0]?.id ?? ""))} disabled={!categories.length}>
          <Plus className="size-4" /> Add item
        </Button>
      </div>

      <p className="mt-3 text-sm text-cream/50">
        {menu.length} items · {menu.filter((m) => !m.isAvailable).length} out of stock · {menu.filter((m) => m.isRecommended).length} recommended
      </p>

      <div className="mt-6 space-y-8">
        {groups.length === 0 && <Empty icon={UtensilsCrossed} title="No items match" />}
        {groups.map((g) => (
          <section key={g.id}>
            <h3 className="mb-3 font-display text-xl font-bold">
              {g.name} <span className="font-mono text-xs font-normal text-cream/40">{g.items.length}</span>
            </h3>
            <ul className="divide-y divide-edge/10 overflow-hidden rounded-3xl border border-edge/10 bg-ink-900">
              {[...g.items].sort(byPosition).map((item) => (
                <li key={item.id} className={cn("flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4", !item.isAvailable && "bg-chili/[0.04]")}>
                  <FoodImage src={item.imageUrl} alt={item.name} category={item.category} className={cn("size-14 shrink-0 rounded-xl", !item.isAvailable && "grayscale")} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                      <VegMark veg={item.isVeg} className="size-3.5" />
                      <span className="truncate">{item.name}</span>
                    </p>
                    <p className="text-sm text-cream/55">
                      {rupee(item.price)} · {item.prepTime} min · {item.orderCount} ordered
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-4 sm:w-auto">
                    <label className="flex items-center gap-2 text-xs font-semibold text-cream/65">
                      <Switch on={item.isAvailable} onChange={(v) => updateItem(item.id, { isAvailable: v }).catch(fail("update"))} label={`${item.name} available`} />
                      {item.isAvailable ? "In stock" : "Out of stock"}
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-cream/65">
                      <Switch on={item.isRecommended} onChange={(v) => updateItem(item.id, { isRecommended: v }).catch(fail("update"))} label={`${item.name} recommended`} />
                      Recommended
                    </label>
                    <div className="ml-auto flex gap-1">
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={() => setEditing({ ...item })} className="grid size-10 place-items-center rounded-full border border-edge/10 hover:border-edge/30">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" aria-label={`Delete ${item.name}`} onClick={() => remove(item)} className="grid size-10 place-items-center rounded-full border border-edge/10 text-chili hover:border-chili">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ItemEditor draft={editing} categories={categories} onClose={() => setEditing(null)} />
      <CategoryManager open={catsOpen} onClose={() => setCatsOpen(false)} categories={categories} menu={menu} />
    </div>
  );
}
