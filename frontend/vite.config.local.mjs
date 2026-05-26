import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Diagnostic-only dev server that targets the *local* backend (port 4000).
// Used by /tmp/nishani-diag/multibranch.mjs to verify features locally
// without disturbing the main vite.config.js (which points at staging).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
