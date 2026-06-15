import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    hmr: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
