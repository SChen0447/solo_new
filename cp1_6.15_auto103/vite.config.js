import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@server': path.resolve(__dirname, './src/server'),
      '@customizer': path.resolve(__dirname, './src/modules/customizer'),
      '@configurator': path.resolve(__dirname, './src/modules/configurator'),
      '@store': path.resolve(__dirname, './src/modules/store'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
