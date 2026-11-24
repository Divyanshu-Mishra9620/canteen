# Techie's Taste: setup & deployment

This guide takes the site from your laptop to a live URL. Everything is stored in **MongoDB Atlas** (a free cloud database), and a small server inside the project talks to it for the website and the owner dashboard (`/admin`).

**What lives where**

| Piece | Where |
|---|---|
| Menu, categories, settings, orders, blocked numbers, menu photos you upload | **MongoDB** |
| The cart and remembered name/hostel on a customer's phone | The browser (a convenience only; orders are never stored there) |
| Owner login | A secure cookie, checked by the server against `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| Website + server code | One project, hosted on **Vercel** |

There is no Razorpay or online payment. Customers **pay on delivery**.

---

## 1. Create the database (MongoDB Atlas, free)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> and create a project.
2. **Create a cluster → M0 (Free)**. Provider **AWS**, region **Mumbai (ap-south-1)**. Wait ~2 minutes while it is created.
3. **Database Access → Add New Database User.** Pick a username and a strong password (use letters and digits only to avoid encoding problems). Privileges: *Read and write to any database*.
4. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)**. Vercel's servers have changing addresses, so this is required. The database user's password is what protects it.
5. **Database → Connect → Drivers.** Copy the connection string. It looks like:

   ```
   mongodb+srv://USERNAME:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real password. If the password contains symbols, URL-encode them (`@` becomes `%40`, `#` becomes `%23`).

## 2. Fill in `.env`

Open `.env` in the project root and set:

```bash
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=techies_taste

ADMIN_EMAIL=you@example.com        # the email you'll type at /admin
ADMIN_PASSWORD=choose-a-strong-one # the password you'll type at /admin

SESSION_SECRET=...                 # already generated for you; keep it secret
```

To generate a new session secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

These are **server-only** secrets. They never reach the browser, and `.env` is git-ignored, so never commit it.

## 3. Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173   ·   owner dashboard: http://localhost:5173/admin
```

One command starts the website **and** the API. On the very first request the default menu (32 dishes, 6 categories) and settings are created in your database automatically, so there is nothing to import.

Sign in at `/admin` with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If something is missing in `.env`, the page tells you exactly what.

> **Phone testing:** location only works on `https://` or `localhost`. To try the site on a real phone, test the deployed link (step 5).

## 4. Day-to-day use of the dashboard

- **Live orders** refresh every few seconds, with a sound alert for each new order. Keep the tab open, and tap anywhere once so the browser allows sound. Orders move New → Preparing → Ready / Out for delivery → Delivered (or Cancel). Each card has Call, WhatsApp and **Block** buttons, and a map link showing how far the customer is.
- **Awaiting WhatsApp:** every order must be sent on WhatsApp by the customer (see below). Until they do, it appears as *Awaiting WhatsApp* and the alert stays silent. When they tap the WhatsApp button, it becomes a normal *New* order and the alert sounds. If you receive the message by other means, use **I got it on WhatsApp: confirm**.
- **Menu management:** add, edit or delete dishes; **In stock** and **Recommended** switches; upload, replace or remove photos (stored in MongoDB); add, rename, reorder and delete categories.
- **Blocked users:** blocked numbers can browse but can never place an order until you unblock them.
- **Settings:** delivery charge (₹10), free-delivery threshold (₹200), owner WhatsApp number (7705912905), and the **Open / Closed** switch (top bar): when closed, customers can browse but not order.
- **Order history:** today's orders and revenue (counting only WhatsApp-confirmed, non-cancelled orders), plus search.

### How the compulsory WhatsApp step works

1. The customer taps **Place order**. The server checks everything and saves it.
2. A screen says **"One last step"** with a big green **Send Order on WhatsApp** button. The close button, Escape and tapping outside are all disabled until they use it.
3. If they close the tab or reload before sending, the same screen comes back the next time they open the site.
4. When they tap the button, WhatsApp opens with the full order written out (ID, items, total, hostel, room, a map link), and the order becomes confirmed in your dashboard.

A website can't see inside WhatsApp, so it can confirm that the customer **opened** WhatsApp with the order, not that they pressed Send. If an order's message never reaches you, ask for it before cooking.

## 5. Deploy on Vercel

1. Push the project to GitHub (its own repository, with `package.json` at the root). `.env` is git-ignored, so your secrets stay out of it.
2. Go to <https://vercel.com/new> and import the repository. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (the defaults).
3. Under **Environment Variables**, add the same five values from your `.env`: `MONGODB_URI`, `MONGODB_DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
4. Click **Deploy**.

`vercel.json` already routes `/admin` and runs the server in Mumbai (`bom1`), next to a Mumbai Atlas cluster. After changing environment variables later, redeploy for them to take effect.

The server code lives in `api/` and `server/`. Vercel turns `api/[...path].ts` into a function that handles every `/api/...` request.

## 6. How orders are protected

Every rule is enforced on the **server**, never trusting the browser:

- Prices come from the database (the browser only says which dishes and how many). The delivery fee and total are computed on the server.
- The hostel must be one of the 11 listed, and the order must be placed **within 500 m of the canteen** (the server measures the distance from the location the phone sends).
- Blocked numbers, a closed canteen and out-of-stock dishes are refused.
- A number can place at most 6 orders an hour, and at most 3 that were never sent on WhatsApp.
- The owner dashboard and every admin action require the signed login cookie (HttpOnly, SameSite=Strict, valid 12 hours).

Things to know:

- **GPS can be faked** with developer tools. The radius check stops normal out-of-area orders, and every order shows its distance with a map link, so block anyone who abuses it.
- **Updates are polled, not pushed.** The dashboard refreshes orders every ~4 seconds; the public menu refreshes every 30 seconds and when the page comes back into view. Ordering always re-checks everything on the server.
- **Free tiers have limits.** Atlas M0 holds 512 MB, plenty for a canteen. A Vercel function that hasn't run for a while takes about a second to wake up.
- **Keep the password strong.** It is the only thing between the internet and your dashboard.

## 7. Item photos

The default menu uses 16 real food photos shared across related dishes (credits in `public/images/CREDITS.txt`). To use a different photo for a dish, open **Menu management → Edit** and **Upload image**. It is cropped to a square, compressed and stored in MongoDB.

To give **every** dish its own bundled photo instead, add square WebP files (under ~150 KB) to `public/images/menu/` named after the dish:

```
sandwich  burger  maggi  chowmein  paneer-chowmein  manchurian-chowmein  finger-chips
chilli-potato  honey-chilli-potato  paneer-chilli  manchurian  manchurian-rice  paneer-rice
fried-rice  steamed-momos  fried-momos  kurkure-momos  cream-momos  veg-roll  paneer-roll
egg-roll  paneer-chili-roll  omelette  egg-bhurji  egg-boiled  egg-bread  aloo-paratha
paneer-paratha  pyaaz-paratha  dahi-paratha  aloo-patties  paneer-patties
```

Then paste `/images/menu/<name>.webp` into each dish's **Image URL** in the dashboard. Missing or broken images fall back to a branded placeholder.

## 8. Changing fixed details

In `src/data/site.ts`: the canteen's address and map link, opening hours (display only), the **hostel list**, the canteen's position and the delivery radius (500 m). The server reads the same file, so one edit covers both the website and the checks. Redeploy afterwards.

## Project structure

```
├─ .env · .env.example               Server-only settings (MongoDB, admin login)
├─ vercel.json                       Routing + server region
├─ api/[...path].ts                  Vercel entry: hands every /api request to server/app.ts
├─ server/
│  ├─ app.ts                         Router
│  ├─ public.ts                      Menu, placing orders, WhatsApp confirmation, images
│  ├─ admin.ts                       Owner endpoints: orders, menu, categories, blocked, settings
│  ├─ auth.ts · http.ts · db.ts      Login cookie, request helpers, MongoDB connection
│  └─ models.ts                      Data shapes + first-run seeding
├─ shared/rules.ts                   Delivery fee, mobile and distance rules (used by site and server)
├─ public/images/                    Food photos (+ CREDITS.txt)
└─ src/
   ├─ main.tsx                       "/" → website, "/admin" → dashboard (lazy-loaded)
   ├─ App.tsx                        Page sections, splash screen, providers
   ├─ data/menu.ts · data/site.ts    Default menu + fixed business details
   ├─ context/                       Cart/menu store, light/dark theme
   ├─ lib/                           API client, order flow (incl. WhatsApp step), location check
   ├─ components/                    Header, hero, menu, checkout drawer, footer…
   └─ admin/                         Dashboard: login, live orders, menu, blocked users, settings, history
```
