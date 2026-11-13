import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Interface d'admin : application séparée du linktree (autre racine, autre
// dossier de sortie). En dev, l'API tourne sur le serveur Node (npm run dev:admin-api).
export default defineConfig({
  root: "admin/ui",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../../dist-admin", emptyOutDir: true },
  server: { port: 5174, proxy: { "/api": "http://localhost:8083" } },
});
