/**
 * Firebase config from Vite env vars (see .env.example and SETUP.md). No SDK imports here,
 * so the main bundle can check configuration without pulling in Firestore.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Without these the public site still renders the bundled default menu, and checkout runs
 * in a clearly-labelled demo mode; real orders always need Firebase.
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/** Local testing against `firebase emulators:start` (ports match firebase.json). */
export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
