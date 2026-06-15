import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3001,
    strictPort: false,
    open: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2020'
  }
});
