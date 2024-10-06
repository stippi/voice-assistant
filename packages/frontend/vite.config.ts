import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        audioWorklet: resolve(__dirname, "src/audio-worklet.ts"),
      },
    },
  },
  server: {
    // The proxy is used to avoid CORS issues when calling respective APIs
    // The response does not include the Access-Control-Allow-Origin header.
    proxy: {
      "/places-api": {
        target: "https://places.googleapis.com/v1/places:searchText",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/places-api/, ""),
      },
      "/directions-api": {
        target: "https://routes.googleapis.com/directions/v2:computeRoutes",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/directions-api/, ""),
      },
      "/mistral": {
        target: "https://api.mistral.ai/v1/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mistral/, ""),
      },
      "/ollama": {
        target: "http://localhost:11434/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ""),
      },
    },
  },
});
