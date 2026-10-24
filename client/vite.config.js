import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail instead of moving to another port, since the server only allows 5173.
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
