import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve("Graphchan"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve("Graphchan/graphchan.html"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
