import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    include: ['phaser', 'synaptic', 'zustand'],
    force: true,
  },
});
