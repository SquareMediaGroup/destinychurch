import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Two pages: the main window and the menu bar popover (src-tauri/tauri.conf.json).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": here("./src") } },
  clearScreen: false,
  server: { port: 1430, strictPort: true },
  envPrefix: ["VITE_"],
  build: {
    target: "safari16",
    rollupOptions: {
      input: {
        main: here("./index.html"),
        menubar: here("./menubar.html"),
      },
    },
  },
});
