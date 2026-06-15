import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    hmr: true,
    host: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
