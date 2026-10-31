import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import type { Category, MenuItem, Settings } from "../data/menu";
import { db } from "./firebase";
import { toCategory, toItem, toSettings } from "./normalize";

type Unsubscribe = () => void;

/** Live menu, categories and settings. Returns one unsubscribe for all three. */
export function subscribePublicData(handlers: {
  onMenu: (items: MenuItem[]) => void;
  onCategories: (categories: Category[]) => void;
  onSettings: (settings: Settings, exists: boolean) => void;
  onError: (error: Error) => void;
}): Unsubscribe {
  if (!db) return () => {};
  const unsubs = [
    onSnapshot(
      query(collection(db, "menu"), orderBy("name")),
      (snap) => handlers.onMenu(snap.docs.map((d) => toItem(d.id, d.data()))),
      handlers.onError,
    ),
    onSnapshot(
      query(collection(db, "categories"), orderBy("order")),
      (snap) => handlers.onCategories(snap.docs.map((d) => toCategory(d.id, d.data()))),
      handlers.onError,
    ),
    onSnapshot(
      doc(db, "settings", "store"),
      (snap) => handlers.onSettings(toSettings(snap.data()), snap.exists()),
      handlers.onError,
    ),
  ];
  return () => unsubs.forEach((u) => u());
}
