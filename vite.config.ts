import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
      "/anthropic": {
        target: "https://api.anthropic.com/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ""),
      },
    },
  },
});
