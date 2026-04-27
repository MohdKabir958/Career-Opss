import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "http://127.0.0.1:4310";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          timeout: 180_000,
          proxyTimeout: 180_000,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              const code = (err as NodeJS.ErrnoException).code;
              if (res && "writeHead" in res && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error:
                      code === "ECONNRESET"
                        ? "Backend connection was reset (likely a dev-server reload). Please retry."
                        : code === "ECONNREFUSED"
                        ? "Backend is not running on " + apiTarget + ". Start it with `npm run web:server`."
                        : "Backend proxy error: " + (err.message || code || "unknown"),
                  }),
                );
              }
            });
          },
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
