# Techie's Taste: setup & deployment

This guide takes the site from your laptop to a live URL with real orders, the owner dashboard (`/admin`) and fake-order blocking.

**What runs where**

| Piece | Where |
|---|---|
| Website + admin panel | React (Vite) static site on Vercel or Netlify |
| Menu, categories, settings, orders, blocked numbers | Cloud Firestore |
| Owner login | Firebase Authentication (email + password) |
| Menu photo uploads (optional) | Firebase Storage |
| Security | `firestore.rules`, `storage.rules` (enforced by Firebase, not the browser) |

---

## 1. Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev            # http://localhost:5173  ·  dashboard: http://localhost:5173/admin
```

Without Firebase keys the site still works in **demo mode**. It shows the bundled menu, and checkout goes straight to WhatsApp without saving the order.

## 2. Create the Firebase project and web app

1. Go to <https://console.firebase.google.com>, then **Add project** (Google Analytics is optional).
2. **Project settings → General → Your apps → Web (`</>`)**. Register the app; Hosting isn't needed.
3. Copy `.env.example` to `.env` and paste in the values from the config shown:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app   # only needed for photo uploads (step 7)
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Restart `npm run dev` after editing `.env`. These keys are safe to ship in a website; access is controlled by the security rules.

## 3. Create the Firestore database

**Build → Firestore Database → Create database.**

- Location: **asia-south1 (Mumbai)** is closest for Indian users. You can't change it later.
- Start in **production mode** (step 4 replaces the rules anyway).

> Skipping this step makes the site's requests fail with *"Cloud Firestore API has not been used in project … or it is disabled"*, and checkout times out.

## 4. Publish the security rules

Pick one option.

**Option A (Console):** open **Firestore Database → Rules**, replace everything with the contents of `firestore.rules`, then click **Publish**. Repeat this whenever `firestore.rules` changes.

**Option B (CLI):**

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # choose your project
firebase deploy --only firestore:rules
```

The rules enforce the following:

- Anyone can read the menu, categories and settings.
- Customers can create an order only if:
  - the mobile number is **not** in `blockedUsers`,
  - the canteen is **open**,
  - the order has status `New` and a server timestamp,
  - the name, 10-digit mobile and room are valid, and the hostel is one of the 11 listed,
  - the order was placed **within 500 m of the canteen** (from the customer's location),
  - the **delivery charge matches the rule** (₹10 below ₹200, free from ₹200),
  - the grand total equals item total + delivery.
- Customers can't read orders, blocked users or anything else. They can only bump a dish's `orderCount` by 1–20 while ordering.
- Only owner accounts (step 5) can edit the menu, settings and blocked list, or read and update orders.

## 5. Create the owner (admin) login

There is no built-in admin password. You create your own:

1. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
2. **Authentication → Users → Add user**. Enter the owner's email and a strong password.
3. Copy the new user's **User UID** from the users table.
4. **Firestore Database → Data → Start collection**:
   - Collection ID: `admins`
   - Document ID: *paste the UID*
   - Add any field, e.g. `role` (string) = `owner`. Save.

To add another owner later, repeat steps 2–4. To remove one, delete their `admins` document.

If someone signs in with an account that isn't in `admins`, the dashboard shows "Not an admin account" with the UID to add.

## 6. First run of the dashboard

1. Open `/admin` and sign in.
2. **Menu management → Import default menu.** This writes the 6 categories, all 32 items from the printed menu, and the default settings.
3. **Settings:** check the owner WhatsApp number (default **6392771136**), the delivery charge (**₹10**) and the free-delivery threshold (**₹200**).
4. Place a test order from the website (on another phone, or a private window). It appears under **Live orders** instantly, with a chime.

Day-to-day use:

- **Live orders:** move each order through New → Preparing → Ready / Out for delivery → Delivered (or Cancel). Each order has Call, WhatsApp and **Block** buttons. Keep the tab open; click anywhere once so the browser allows the alert sound.
- **Menu:** add, edit or delete items, toggle **In stock** / **Recommended**, upload photos, and manage categories (add, rename, reorder, or delete when empty).
- **Blocked users:** blocked numbers can browse but can never place an order until you unblock them.
- **Open/Closed switch** (top bar): when closed, customers can browse but not order.
- **Order history:** today's order count, revenue, deliveries and average order value, plus search.

## 7. (Optional) Photo uploads with Firebase Storage

Firebase requires the pay-as-you-go **Blaze** plan to create a Storage bucket for new projects; the free monthly allowance still applies. If you'd rather stay on the free plan, skip this section. You can still put photos in `public/images/menu/` and paste their path (e.g. `/images/menu/burger.webp`) into the item's **Image URL** field.

1. **Build → Storage → Get started** (same region as Firestore).
2. Set `VITE_FIREBASE_STORAGE_BUCKET` in `.env` (and on Vercel/Netlify).
3. Publish `storage.rules` (Console → Storage → Rules, or `firebase deploy --only storage`).

Uploads are centre-cropped to a square and compressed to WebP in the browser before upload, so cards stay fast.

## 8. Item photos (AI-generated or your own)

The default menu uses 16 real food photos shared across related dishes. To give **every** dish its own square photo, add these files to `public/images/menu/` (1:1, WebP, under ~150 KB each):

```
sandwich  burger  maggi  chowmein  paneer-chowmein  manchurian-chowmein  finger-chips
chilli-potato  honey-chilli-potato  paneer-chilli  manchurian  manchurian-rice  paneer-rice
fried-rice  steamed-momos  fried-momos  kurkure-momos  cream-momos  veg-roll  paneer-roll
egg-roll  paneer-chili-roll  omelette  egg-bhurji  egg-boiled  egg-bread  aloo-paratha
paneer-paratha  pyaaz-paratha  dahi-paratha  aloo-patties  paneer-patties
```

Each name becomes `<name>.webp`, e.g. `public/images/menu/kurkure-momos.webp`. Then either:

- set `USE_ITEM_PHOTOS = true` in `src/data/menu.ts` **before** importing the default menu, or
- if the menu is already imported, paste `/images/menu/<name>.webp` into each item's **Image URL** in the dashboard (or upload the file there).

Missing or broken images fall back to a branded placeholder automatically.

## 9. Deploy

### Vercel

1. Push the project to GitHub (its own repository, with `package.json` at the root).
2. Go to <https://vercel.com/new>, import the repository. The framework preset should be **Vite**.
3. Build command `npm run build`, output directory `dist`.
4. **Environment Variables:** add every `VITE_FIREBASE_*` value from your `.env`.
5. Deploy. `vercel.json` already makes `/admin` work on refresh.

### Netlify

1. **Add new site → Import from Git**.
2. Build command `npm run build`, publish directory `dist`.
3. **Site settings → Environment variables:** add the `VITE_FIREBASE_*` values.
4. Deploy. `public/_redirects` already handles `/admin`.

### After the first deploy (both hosts)

**Firebase → Authentication → Settings → Authorized domains → Add domain:** add your live domain (e.g. `techies-taste.vercel.app`) or the owner login will be refused.

## 10. (Optional) Test everything locally with emulators

```bash
firebase emulators:start --only auth,firestore,storage
# in another terminal:
VITE_USE_EMULATORS=true npm run dev
```

Ports are set in `firebase.json` (Firestore 8085, Auth 9099, Storage 9199, UI 4000). Create the owner in the Emulator UI (http://localhost:4000), add `admins/<uid>`, then use `/admin` as in step 6.

firebase-tools v14+ needs **Java 21**. With Java 17, use `npx firebase-tools@13 emulators:start …`.

## 11. Things to know

- **Delivery area and hostels.** Orders need the customer's location, which must be within **500 m** of the canteen (Plus Code 7MR5PCHQ+J9Q, 26.729087, 83.438484). The hostel is picked from a fixed list. Both are checked in the browser **and** by `firestore.rules`. To change the radius, the canteen position or the hostel list, edit `src/data/site.ts` **and** the matching values in `firestore.rules`, then **re-publish the rules** (step 4).
- **Location needs https.** It works on `localhost` and on the deployed Vercel/Netlify site. Opening the dev server from a phone at `http://192.168.x.x:5173` won't allow location, so test on the phone with the deployed https link.
- **GPS can be faked** with developer tools. The radius check stops normal out-of-area orders, and every order shows its distance with a map pin in the dashboard, so block anyone who abuses it.
- **Prices are taken from the customer's browser.** The rules check the delivery charge and totals, but not each item's price against the menu, because that would need a Cloud Function (Blaze plan). The dashboard shows every item and price, so check unusual totals. To harden it later, move order creation into a callable Cloud Function that reads prices from `menu`.
- **`orderCount` (used for "Popular")** can be bumped by customers in small steps while ordering. That's fine for sorting, but it isn't an audit log.
- **The blocked check is per mobile number.** Someone could type a different number, but they'd then need to answer calls on it for delivery.
- **Placeholders to replace:** the address, `mapsUrl` and opening hours in `src/data/site.ts`, and your developer link in `DEVELOPER`.

## Project structure

```
├─ firestore.rules · storage.rules · firebase.json   Security rules + emulator config
├─ .env.example                                      Firebase keys template
├─ vercel.json · public/_redirects                   SPA routing for /admin
├─ public/images/                                    Food photos (+ CREDITS.txt)
└─ src/
   ├─ main.tsx                 Routes "/" → site, "/admin" → dashboard (lazy-loaded)
   ├─ App.tsx                  Page sections, splash screen, providers
   ├─ index.css                Tailwind v4 theme: dark/light tokens, utilities
   ├─ data/menu.ts             Schema + the 32 default items (seed) + default settings
   ├─ data/site.ts             Address, phone, hours, developer credit
   ├─ context/store.tsx        Live menu/settings, cart, delivery maths, UI state
   ├─ context/theme.tsx        Light/dark mode with animated switch
   ├─ lib/orders.ts            Delivery rule, validation, placeOrder(), WhatsApp message
   ├─ lib/firebase*.ts         Firebase init (Firestore loaded on demand)
   ├─ components/              Header, hero, menu (cards, chips, filter sheet), cart & checkout, footer…
   └─ admin/                   Dashboard: login, live orders, menu, blocked users, settings, history
```
