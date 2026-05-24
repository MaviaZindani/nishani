import { io } from 'socket.io-client';

// Opens a realtime connection to the backend. Same-origin in dev —
// Vite proxies /socket.io to the API server. The admin JWT is sent in
// the handshake so the server can authorise the connection.
export function createOrderSocket() {
  return io({
    auth: { token: localStorage.getItem('nishani_token') },
  });
}
