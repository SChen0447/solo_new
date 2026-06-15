import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.gif', '**/*.svg'],
  build: {
    assetsInlineLimit: 4096,
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
});
