import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    host: true,
    open: false
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist'
  },
  optimizeDeps: {
    include: ['three', 'phaser']
  }
});
