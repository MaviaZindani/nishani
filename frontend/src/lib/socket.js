import { io } from 'socket.io-client';

// In dev, same-origin — Vite proxies /socket.io to the API server.
// In a production build (Vercel), the static frontend has no server of
// its own, so we connect Socket.IO straight to the Render backend.
const BACKEND_URL = import.meta.env.PROD ? 'https://nishani.onrender.com' : '';

export function createOrderSocket() {
  return io(BACKEND_URL, {
    auth: { token: localStorage.getItem('nishani_token') },
    // Optional belt-and-braces: list preferred transports explicitly.
    transports: ['websocket', 'polling'],
  });
}
