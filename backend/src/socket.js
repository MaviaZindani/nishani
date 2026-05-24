const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { ROLES } = require('./utils/helpers');

let io = null;

// Live order events are delivered only to this room.
const ORDER_ROOM = 'order-handlers';
const ROOM_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORDER_HANDLER];

// Attaches a Socket.IO server to the HTTP server.
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || true },
  });

  // Every socket must present a valid admin JWT (sent in the handshake).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.admin = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket) => {
    // Order Handlers and Super Admins receive the live order feed.
    if (ROOM_ROLES.includes(socket.admin.role)) {
      socket.join(ORDER_ROOM);
    }
  });

  return io;
}

// Broadcasts an event to every connected order handler.
// Safe no-op if called before the socket server is initialised.
function emitOrders(event, payload) {
  if (io) io.to(ORDER_ROOM).emit(event, payload);
}

module.exports = { initSocket, emitOrders };
