import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    host: '0.0.0.0',
    hot: true
  },
  worker: {
    format: 'es'
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
