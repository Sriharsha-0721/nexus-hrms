import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,       // pin the dev server port
    strictPort: false, // allow fallback to 5174 etc. — proxy still works
    proxy: {
      // Any request starting with /api is forwarded to the backend
      // This eliminates CORS completely — the browser thinks it's talking
      // to the same origin (localhost:5173)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
