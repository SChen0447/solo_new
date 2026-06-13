import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  optimizeDeps: {
    include: ['three']
  },
  server: {
    port: 5173,
    host: true
  }
});
