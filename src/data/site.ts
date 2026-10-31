/**
 * Static business + developer details. Edit these before publishing.
 * Live, owner-editable values (delivery charge, WhatsApp number, open/closed) live in
 * Firestore `settings/store` and are managed from /admin → Settings.
 */
export const SITE = {
  name: "Techie's Taste",
  tagline: "Good Food • Happy Vibes",
  /** Contact number shown in the footer (tap to call). */
  phone: "6392771136",
  address: "UCC (University Canteen Chauraha), Singhariya, Rapti Nagar Phase-4, Gorakhpur 273010",
  /** Exact pin shared by the owner. Leave empty to search Google Maps for `address`. */
  mapsUrl: "https://maps.app.goo.gl/9CDtxFCPPWWpAAYMA",
  /**
   * Canteen position (Plus Code 7MR5PCHQ+J9Q). Orders are only accepted within `deliveryRadiusM`.
   * Keep both in sync with `withinDeliveryRadius()` in firestore.rules.
   */
  location: { lat: 26.729087, lng: 83.438484 },
  deliveryRadiusM: 500,
  /** Opening hours in 24h local time (display only; ordering follows the admin open/closed toggle). */
  hours: { open: 8, close: 22 },
};

/** Hostels we deliver to. Keep in sync with the list in firestore.rules. */
export const HOSTELS = [
  "Tagore",
  "VS",
  "Ambedkar",
  "Tilak",
  "Ramanujan",
  "Raman",
  "Subhash",
  "New Girl's",
  "Sarojini",
  "Kalpana",
  "Saraswati",
] as const;

export const mapsLink = () =>
  SITE.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;

export const DEVELOPER = {
  name: "Divyanshu Mishra",
  firstName: "Divyanshu",
  initials: "DM",
  url: "https://github.com/Divyanshu-Mishra9620",
  pitch: "I design and build fast, good-looking websites for restaurants, cafés and small businesses.",
};
