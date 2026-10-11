import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Two pages: the main window and the menu bar popover (src-tauri/tauri.conf.json).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  clearScreen: false,
  server: { port: 1430, strictPort: true },
  envPrefix: ["VITE_"],
  build: {
    target: "safari16",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        menubar: resolve(__dirname, "menubar.html"),
      },
    },
  },
});
