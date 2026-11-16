import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Keep framework and icon code in stable vendor chunks so page/app
        // updates can reuse the cached dependencies in the browser.
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
});
