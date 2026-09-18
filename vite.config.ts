/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite";
import { linktreePlugin } from "./vite/linktreePlugin.ts";

// aylabs.fr ne renvoie pas d'en-tête CORS : le navigateur lit le fichier sur
// notre propre origine. Même relais que docker/nginx.conf.template en prod.
const youtubeStatsProxy: Record<string, ProxyOptions> = {
  "/youtube-stats.json": { target: "https://aylabs.fr", changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), linktreePlugin("links.json")],
  server: { proxy: youtubeStatsProxy },
  preview: { proxy: youtubeStatsProxy },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
