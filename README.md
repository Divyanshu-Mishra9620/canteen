# Techie's Taste

A mobile-first food-ordering website for **Techie's Taste**, a college canteen serving momos, rolls, chowmein, paranthas and egg specials. Customers order to their hostel room; the owner runs everything from a live dashboard.
Designed and built by [Divyanshu Mishra](https://github.com/Divyanshu-Mishra9620).

**→ Setup, Firebase and deployment: [SETUP.md](SETUP.md)**

## For customers

- **Menu-first ordering:** all 32 dishes grouped by category, with sticky category chips, live search in the header, and veg/non-veg marks, prep times and Recommended badges.
- **Filters & sort:** a bottom sheet on phones. Filter by Veg / Non-Veg, price, prep time, popularity, top recommended, ₹50/₹100 & under, or available now.
- **Cart & checkout:** − qty + steppers, a free-delivery progress bar (₹10 below ₹200, free above), and a full bill. Name, mobile, hostel and room are validated and remembered for next time.
- **Order + WhatsApp:** the order is saved instantly (owner sees it live), then one tap sends a formatted message to the canteen's WhatsApp.
- **Delight:** a 2-second splash screen, swipeable hero deck, scroll-velocity marquee, parallax carousel, pinned sideways category tour, a budget meal planner with a printed-receipt animation, a ⌘K command palette, and **light/dark mode** with a circular reveal.

## For the owner (`/admin`)

- Live orders with a sound alert, status flow (New → Preparing → Ready/Out → Delivered/Cancelled), and Call, WhatsApp and Block buttons
- Menu management: items, photos (upload, replace or remove), stock and recommended toggles, categories
- Blocked users: blocking is enforced by Firestore security rules, not just the UI
- Settings: delivery charge, free-delivery threshold, WhatsApp number, open/closed switch
- Order history with today's orders and revenue

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Firebase (Firestore, Auth, Storage) · Motion · Embla Carousel · Lenis · cmdk · Sonner · Lucide

## Quick start

```bash
npm install
cp .env.example .env   # add your Firebase keys (see SETUP.md); without them the site runs in demo mode
npm run dev            # http://localhost:5173 and http://localhost:5173/admin
npm run build          # production build in dist/
```

Photos: Pexels and Wikimedia Commons; see `public/images/CREDITS.txt`. The egg bhurji photo is CC BY 2.0, and its credit in the footer must stay.
