/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { linktreePlugin } from "./vite/linktreePlugin.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), linktreePlugin("links.json")],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
