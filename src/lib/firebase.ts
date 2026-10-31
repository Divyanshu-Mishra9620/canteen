import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured, usingEmulators } from "./firebase-config";

// This module is only ever loaded with a dynamic import() from the public site,
// so the Firestore SDK stays out of the first-load bundle.

export const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Optional fields (e.g. `tags`) may be undefined on edited items; skip them instead of throwing.
export const db: Firestore | null = app ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : null;

if (db && usingEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8085);
