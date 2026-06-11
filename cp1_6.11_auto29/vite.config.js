import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    esbuild: {
      target: 'es2020',
      pure: ['console.log', 'console.debug']
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'lit-vendor': ['lit']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['lit']
  }
});
