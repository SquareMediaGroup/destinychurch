import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1431, strictPort: true },
  // Plain CSS, no PostCSS: stops Vite finding the website's Tailwind config.
  css: { postcss: {} },
  build: { target: "safari16" },
});
