import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@store': path.resolve(__dirname, './src/store'),
      '@traffic': path.resolve(__dirname, './src/traffic'),
      '@terrain': path.resolve(__dirname, './src/terrain'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
