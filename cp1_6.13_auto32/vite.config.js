import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['three', 'three-mesh-bvh'],
  },
  server: {
    port: 5173,
    open: false,
  },
});
