/**
 * Menu schema + default ("seed") data.
 *
 * At runtime the menu comes from Firestore (`menu`, `categories`, `settings/store`).
 * This file is used (a) to import the default menu from the admin panel on first run and
 * (b) as a read-only fallback so the site still renders before Firebase is configured.
 */

export type CategoryId = string;
export type Tag = "spicy" | "protein" | "new";

export interface MenuItem {
  id: string;
  name: string;
  category: CategoryId;
  price: number;
  isVeg: boolean;
  description: string;
  imageUrl: string;
  /** Minutes, editable by the admin. */
  prepTime: number;
  isRecommended: boolean;
  isAvailable: boolean;
  orderCount: number;
  tags?: Tag[];
  /** Sort key for the default "menu order"; admin-added items go to the end. */
  position?: number;
}

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  imageUrl: string;
  order: number;
}

export interface Settings {
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  /** 10-digit Indian mobile number, without +91. */
  whatsappNumber: string;
  isOpen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  deliveryCharge: 10,
  freeDeliveryThreshold: 200,
  whatsappNumber: "6392771136",
  isOpen: true,
};

/**
 * Flip to `true` once per-item photos exist at /public/images/menu/<item-id>.webp
 * (see SETUP.md for the full filename list), then import the menu from the admin panel.
 */
export const USE_ITEM_PHOTOS = false;

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const photo = (name: string) => `/images/${name}.jpg`;

export const SEED_CATEGORIES: Category[] = [
  { id: "fast-food", name: "Fast Food", tagline: "Wok-tossed, deep-fried and loaded. The comfort-food classics.", imageUrl: photo("burger"), order: 1 },
  { id: "momos", name: "Momos", tagline: "Steamed, fried, crunchy or creamy. Always with that red chutney.", imageUrl: photo("momos"), order: 2 },
  { id: "rolls", name: "Rolls", tagline: "Flaky wraps rolled tight around spicy, saucy fillings.", imageUrl: photo("roll"), order: 3 },
  { id: "egg", name: "Egg Specials", tagline: "Protein Power!", imageUrl: photo("egg-bhurji"), order: 4 },
  { id: "paranthas", name: "Paranthas", tagline: "Hot off the tawa, stuffed generously, served with love.", imageUrl: photo("parantha"), order: 5 },
  { id: "patties", name: "Patties", tagline: "Flaky, buttery puffs for the quick 5-minute break.", imageUrl: photo("patties"), order: 6 },
];

type SeedRow = [name: string, price: number, prepTime: number, photo: string, description: string, extra?: Partial<MenuItem>];

const rows: Record<CategoryId, SeedRow[]> = {
  "fast-food": [
    ["Sandwich", 50, 8, "sandwich", "Toasted bread layered with crunchy veggies and green chutney."],
    ["Burger", 50, 8, "burger", "Crispy veg patty, fresh lettuce and house sauce in a soft bun.", { isRecommended: true }],
    ["Maggi", 50, 7, "maggi", "The hostel-night classic, masala and veggies, made just right."],
    ["Chowmein", 50, 10, "chowmein", "Wok-tossed noodles with cabbage, capsicum and soy.", { isRecommended: true }],
    ["Paneer Chowmein", 70, 12, "chowmein", "Our chowmein, loaded with soft paneer cubes.", { tags: ["protein"] }],
    ["Manchurian Chowmein", 60, 12, "chowmein", "Noodles topped with saucy veg manchurian balls."],
    ["Finger Chips", 50, 8, "fries", "Golden, salted fries. Crispy outside, fluffy inside."],
    ["Chilli Potato", 60, 10, "chilli-potato", "Crispy potato fingers tossed in fiery chilli sauce.", { tags: ["spicy"] }],
    ["Honey Chilli Potato", 70, 12, "chilli-potato", "Sweet, sticky and spicy, finished with sesame.", { isRecommended: true }],
    ["Paneer Chilli", 100, 12, "chilli-paneer", "Paneer, peppers and onions in a glossy Indo-Chinese glaze.", { tags: ["spicy", "protein"] }],
    ["Manchurian", 60, 12, "manchurian", "Veggie dumplings in a tangy, garlicky gravy."],
    ["Manchurian Rice", 70, 12, "fried-rice", "Fried rice paired with a side of manchurian."],
    ["Paneer Rice", 70, 12, "fried-rice", "Fried rice tossed with paneer and spring onions.", { tags: ["protein"] }],
    ["Fried Rice", 60, 10, "fried-rice", "Fluffy wok-fried rice with crunchy vegetables."],
  ],
  momos: [
    ["Steamed Momos", 50, 10, "momos", "Soft, juicy dumplings with spicy red chutney.", { isRecommended: true }],
    ["Fried Momos", 60, 12, "fried-momos", "Golden-fried for that extra crunch."],
    ["Kurkure Momos", 70, 12, "fried-momos", "Coated in a crunchy crust and fried till they crackle.", { isRecommended: true, tags: ["spicy"] }],
    ["Cream Momos", 85, 12, "momos", "Tossed in a rich, creamy, mildly spiced sauce.", { tags: ["new"] }],
  ],
  rolls: [
    ["Veg Roll", 60, 8, "roll", "Spiced veggies, onions and chutney in a flaky wrap."],
    ["Paneer Roll", 70, 10, "roll", "Tikka-style paneer rolled up with onions and mint chutney.", { isRecommended: true, tags: ["protein"] }],
    ["Egg Roll", 50, 8, "roll", "Paratha layered with egg, onions and tangy sauces.", { isVeg: false, tags: ["protein"] }],
    ["Paneer Chili Roll", 70, 10, "roll", "Chilli paneer, the Indo-Chinese way, wrapped to go.", { tags: ["spicy", "protein"] }],
  ],
  egg: [
    ["Omelette (2 Eggs)", 50, 5, "omelette", "Fluffy masala omelette with onions, chillies and coriander.", { isVeg: false }],
    ["Egg Bhurji (2 Eggs)", 60, 7, "egg-bhurji", "Spiced scrambled eggs, street-style.", { isVeg: false, isRecommended: true }],
    ["Egg Boiled (2 Eggs)", 30, 10, "omelette", "Simple, clean protein with salt and pepper.", { isVeg: false }],
    ["Egg Bread (2 Eggs)", 40, 6, "egg-bhurji", "Toasted bread with eggs, the ideal quick breakfast.", { isVeg: false }],
  ],
  paranthas: [
    ["Aloo Paratha", 50, 10, "parantha", "Spiced potato stuffing, crisp on the tawa.", { isRecommended: true }],
    ["Paneer Paratha", 60, 12, "parantha", "Loaded with crumbled, seasoned paneer.", { tags: ["protein"] }],
    ["Pyaaz Paratha", 60, 10, "parantha", "Onions, green chillies and ajwain, flaky and fragrant."],
    ["Dahi Paratha", 70, 10, "parantha", "Served with a bowl of cool, fresh curd."],
  ],
  patties: [
    ["Aloo Patties", 30, 3, "patties", "Flaky puff pastry with a spiced potato filling."],
    ["Paneer Patties", 40, 3, "patties", "Buttery layers around a paneer masala centre.", { tags: ["protein"] }],
  ],
};

export const SEED_MENU: MenuItem[] = Object.entries(rows)
  .flatMap(([category, list]) => list.map((row) => [category, row] as const))
  .map(([category, [name, price, prepTime, img, description, extra]], position) => {
    const id = slugify(name);
    return {
      id,
      name,
      category,
      price,
      prepTime,
      description,
      imageUrl: USE_ITEM_PHOTOS ? `/images/menu/${id}.webp` : photo(img),
      isVeg: true,
      isRecommended: false,
      isAvailable: true,
      orderCount: 0,
      position,
      ...extra,
    };
  });

export const HERO_STACK = ["burger", "steamed-momos", "chowmein", "paneer-roll", "aloo-paratha"];

export const TAG_LABEL: Record<Tag, string> = {
  spicy: "Spicy",
  protein: "Protein",
  new: "New",
};
