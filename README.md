# Techie's Taste

A mobile-first food-ordering website for **Techie's Taste**, a college canteen serving momos, rolls, chowmein, paranthas and egg specials. Customers order to their hostel room and send the order on WhatsApp; the owner runs everything from a live dashboard. All data lives in **MongoDB**.
Designed and built by [Divyanshu Mishra](https://github.com/Divyanshu-Mishra9620).

**→ Setup, MongoDB and deployment: [SETUP.md](SETUP.md)**

## For customers

- **Menu-first ordering:** all 32 dishes grouped by category, with sticky category chips, live search in the header, and veg/non-veg marks, prep times and Recommended badges.
- **Filters & sort:** a bottom sheet on phones. Filter by Veg / Non-Veg, price, prep time, popularity, top recommended, ₹50/₹100 & under, or available now.
- **Cart & checkout:** − qty + steppers, a free-delivery progress bar (₹10 below ₹200, free above), and a full bill. Name, mobile, hostel (a fixed dropdown of the 11 hostels) and room are validated and remembered for next time. **Pay on delivery.**
- **Location-checked:** orders are taken only within 500 m of the canteen, and location access is required at checkout.
- **WhatsApp is compulsory:** the order is saved, then a screen the customer can't close sends it to the canteen's WhatsApp. It comes back after a reload if they skipped it.
- **Delight:** a 2-second splash screen, swipeable hero deck, scroll-velocity marquee, a budget meal planner with a printed-receipt animation, a ⌘K command palette, and **light/dark mode** with a circular reveal.

## For the owner (`/admin`)

- Live orders with a sound alert, a status flow (New → Preparing → Ready/Out → Delivered/Cancelled), "Awaiting WhatsApp" orders kept apart from confirmed ones, and Call, WhatsApp and Block buttons
- Menu management: items, photos (stored in MongoDB), stock and recommended toggles, categories
- Blocked users, enforced on the server
- Settings: delivery charge, free-delivery threshold, WhatsApp number, open/closed switch
- Order history with today's orders and revenue

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Node API (Vercel functions) · MongoDB Atlas · Motion · Embla Carousel · Lenis · cmdk · Sonner · Lucide

## Quick start

```bash
npm install
# put your MongoDB connection string and admin login in .env (see SETUP.md)
npm run dev        # http://localhost:5173 and http://localhost:5173/admin
npm run build      # production build in dist/
```

Photos: Pexels and Wikimedia Commons; see `public/images/CREDITS.txt`. The egg bhurji photo is CC BY 2.0, and its credit in the footer must stay.
