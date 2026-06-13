import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  base: './',
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['phaser']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  }
});
