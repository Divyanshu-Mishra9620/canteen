import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Serves the /api backend (server/app.ts) from the Vite dev server, so `npm run dev` runs the
 * whole site on one address. In production the same handler runs as a Vercel function
 * (api/[...path].ts). Reloaded on every request, so server edits apply instantly.
 */
function apiDevServer(): Plugin {
  return {
    name: "techies-taste-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const mod = await server.ssrLoadModule("/server/app.ts");
          await mod.default(req, res);
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          console.error(err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: { code: "server_error", message: "API failed to start. See the terminal." } }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Server-only settings (MONGODB_URI, ADMIN_*, SESSION_SECRET) come from .env but are never
  // exposed to the browser: only VITE_-prefixed variables are. Real environment variables win.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["MONGODB_URI", "MONGODB_DB", "ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET"]) {
    if (env[key] && process.env[key] === undefined) process.env[key] = env[key];
  }
  return { plugins: [react(), tailwindcss(), apiDevServer()] };
});
