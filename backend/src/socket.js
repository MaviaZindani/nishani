const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { ROLES, corsOrigin } = require('./utils/helpers');

let io = null;

// Two kinds of Socket.IO rooms drive the multi-branch live feed:
//   - super-admins   → every Super Admin (sees every branch's events)
//   - branch_<id>    → Order Handlers belonging to that one branch
// Product Managers don't join either — they receive no order events.
const SUPER_ROOM = 'super-admins';
const branchRoom = (id) => `branch_${id}`;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin() },
  });

  // JWT is read from the handshake on every connection.
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
    const { role, branchId } = socket.admin;
    if (role === ROLES.SUPER_ADMIN) {
      socket.join(SUPER_ROOM);
    } else if (role === ROLES.ORDER_HANDLER && branchId) {
      socket.join(branchRoom(branchId));
    }
    // PMs and unassigned handlers join no room — no events delivered.
  });

  return io;
}

// Broadcast an order event to exactly one branch's handlers, plus every
// Super Admin (who has visibility across all branches).
function emitToBranch(branchId, event, payload) {
  if (!io) return;
  const targets = [SUPER_ROOM];
  if (branchId) targets.push(branchRoom(branchId));
  io.to(targets).emit(event, payload);
}

// How many Order Handlers are currently connected for this branch.
// Drives auto-close behaviour: when this hits 0 the branch can't take orders.
function countOnlineHandlers(branchId) {
  if (!io || !branchId) return 0;
  const room = io.sockets.adapter.rooms.get(branchRoom(branchId));
  return room ? room.size : 0;
}

module.exports = { initSocket, emitToBranch, countOnlineHandlers };
