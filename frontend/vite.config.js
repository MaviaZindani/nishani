import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies API + uploaded files to the Express backend,
// so the frontend and backend can run on separate ports during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://nishani.onrender.com',
      '/uploads': 'https://nishani.onrender.com',
      // Socket.IO — ws:true proxies the WebSocket upgrade too.
      '/socket.io': { target: 'https://nishani.onrender.com', ws: true },
    },
  },
});
