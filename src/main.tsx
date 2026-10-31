import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/caveat/600.css";
import "./index.css";
import App from "./App";

// The owner dashboard (and Firebase Auth/Storage) is only downloaded on /admin.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const isAdminRoute = window.location.pathname.replace(/\/+$/, "") === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={<div className="grid min-h-svh place-items-center font-mono text-sm text-cream/50">Loading dashboard…</div>}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
