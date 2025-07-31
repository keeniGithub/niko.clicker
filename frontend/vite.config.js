import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Прокси для API запросов
      '/api': {
        target: 'http://eu-api.qual.su:6543',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Прокси для WebSocket
      '/ws': {
        target: 'ws://eu-api.qual.su:6543',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0 // Чтобы избежать проблем с MIME-типами
  },
  define: {
    'import.meta.env.VITE_WS_URL': JSON.stringify('wss://eu-api.qual.su:6543/ws')
  }
})