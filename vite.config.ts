import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @see https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "safari16",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 2048,
  },
});
