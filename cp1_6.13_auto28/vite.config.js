import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['three', 'three-mesh-bvh']
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    minify: 'terser'
  }
})
