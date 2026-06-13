import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    host: true,
    open: true
  },
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls'
    ]
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  }
});
