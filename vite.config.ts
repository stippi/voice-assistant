import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The proxy is used to avoid CORS issues when calling the Google Places API
    // The response does not include the Access-Control-Allow-Origin header.
    proxy: {
      '/place-api': {
        target: 'https://places.googleapis.com/v1/places:searchText',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/place-api/, '')
      }
    }
  }
})
