// Vercel serverless entry. vercel.json rewrites every /api/... request to this one function,
// and server/app.ts routes it (Vercel's root-level catch-all files only match a single segment).
export { default } from "../server/app.js";
