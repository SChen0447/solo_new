import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 8080,
    open: false,
    hmr: true
  },
  build: {
    target: 'es2022',
    sourcemap: true
  }
})
