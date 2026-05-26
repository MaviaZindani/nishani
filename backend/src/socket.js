const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./lib/prisma');
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

    // When the LAST Order Handler of a branch goes offline, flip the
    // branch's `isOpen` flag to false. The next handler to sign in will
    // see the "Open your branch?" prompt and must explicitly accept.
    socket.on('disconnect', async () => {
      if (role !== ROLES.ORDER_HANDLER || !branchId) return;
      // socket.io has already removed this socket from the room by now.
      if (countOnlineHandlers(branchId) > 0) return;
      try {
        await prisma.branch.update({
          where: { id: branchId },
          data: { isOpen: false },
        });
      } catch {
        /* ignore — branch may have been deleted */
      }
    });
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
