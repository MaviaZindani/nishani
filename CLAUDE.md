# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nishani** is a reusable, single-store online-ordering website (modelled on iceberg.pk).
It is two independent apps in one repo:

- `backend/` — Express + Prisma REST API on **SQLite**. Port **4000**.
- `frontend/` — React (Vite) single-page app: a customer storefront **and** an
  admin portal at `/admin/*`. Port **5173**.

There is no shared package or workspace root — each app has its own `package.json`
and is installed/run separately.

## Commands

Backend (`cd backend`):

| Command | Purpose |
|---|---|
| `npm run setup` | First-time setup: generate Prisma client, push schema, seed |
| `npm run dev` | Run API with nodemon (auto-reload) |
| `npm start` | Run API once |
| `npm run db:seed` | Re-seed (wipes & repopulates all tables) |
| `npm run db:reset` | Drop schema, recreate, re-seed |

Frontend (`cd frontend`):

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (proxies `/api` + `/uploads` to `:4000`) |
| `npm run build` | Production build — also the fastest way to catch JSX/import errors |

**Both servers must run together** for development. There is no test suite; verify
changes with `npm run build` (frontend) and the running app.

## Architecture

### Request flow
Browser → Vite dev server (`:5173`) → proxies `/api` and `/uploads` → Express (`:4000`)
→ Prisma → SQLite file at `backend/prisma/dev.db`. In production the frontend is built
to static files and the API is hosted separately; the proxy is dev-only (`vite.config.js`).

### Backend (`backend/src/`)
- `index.js` mounts routers under `/api/*` and ends with one central error handler
  that maps Prisma error codes (`P2025`, `P2002`) and multer errors to clean JSON.
- `routes/*.js` — one file per resource. Every async route is wrapped in `asyncHandler`
  (from `utils/helpers.js`) so thrown errors reach that central handler.
- Admin routes are gated by `middleware/auth.js`: `requireAuth` (any signed-in
  admin) or `requireRole(...roles)` (admin with a specific role). The JWT carries
  the user's `role` so no DB lookup is needed.
- File uploads go through `middleware/upload.js` (multer → `backend/uploads/`, served
  statically at `/uploads`). The DB stores the public path `/uploads/<filename>`.
- `prisma/seed.js` is destructive — it `deleteMany`s every table before inserting.

### Frontend (`frontend/src/`)
- `App.jsx` defines all routes: storefront pages under `StoreLayout`, admin pages
  under `AdminLayout`. `RequireAdmin` checks login; `RequireRole` checks the role.
- `context/AuthContext` holds the admin session; `context/CartContext` holds the cart.
  Both persist to `localStorage` (`nishani_token`, `nishani_user`, `nishani_cart`).
- `api/client.js` is the single axios instance; an interceptor attaches the JWT.
- `lib/format.js` (money, dates, status colours), `lib/orders.js` (status
  transitions) and `lib/roles.js` (RBAC) are shared by storefront and admin — keep
  this logic in sync with the backend.

## Roles & access control (RBAC)

Three admin roles, defined as plain strings in `backend/src/utils/helpers.js`
(`ROLES`) and mirrored in `frontend/src/lib/roles.js`:

- **`SUPER_ADMIN`** — full access; the only role that can manage admin accounts
  (`/api/users`) and see income/reports.
- **`ORDER_HANDLER`** — orders (accept/dispatch/close/cancel), delivery areas,
  product stock toggle.
- **`PRODUCT_MANAGER`** — products, categories, offers, product stock toggle.

Enforcement is in **two layers, and both must agree**:
1. Backend — `requireRole(...)` on each route (the real security boundary).
2. Frontend — `lib/roles.js` `ACCESS` map drives `RequireRole` route guards and
   the role-filtered sidebar in `AdminLayout`. This is UX only.

When changing who can do what, update the route guard **and** the `ACCESS` map.
`requireRole` returns `403`; the frontend renders `Forbidden`.

## Multi-branch architecture & realtime

The platform is **multi-branch**. A `Branch` row represents a physical
location. `DeliveryArea.branchId` decides which branch fulfils an order
placed in that area — when a customer checks out, the backend reads the
chosen area's `branchId` and writes it onto the new `Order`. Schema-wise:
`AdminUser.branchId`, `Order.branchId`, `DeliveryArea.branchId` are all
nullable `Int?` with `onDelete: SetNull`, so deleting a branch never
breaks history.

### Roles + branches

| Role | branchId | Sees |
|---|---|---|
| `SUPER_ADMIN` | unused (null) | every branch's orders & events |
| `ORDER_HANDLER` | **required** | only the orders routed to their own branch |
| `PRODUCT_MANAGER` | unused | no order events (catalogue is global) |

The JWT carries `role` + `branchId`, so route guards and the socket server
authorise without a DB hit. Order routes (`routes/orders.js`) filter the
list query by branch for handlers and enforce `sameBranch(admin, order)`
on `GET /:id`, `PATCH /:id/claim`, and `PATCH /:id/status`.

### Socket.IO rooms (`backend/src/socket.js`)

Sockets authenticate with the admin JWT (sent in the handshake `auth`).
On connection the server joins exactly one of two kinds of rooms:

- `super-admins` — every Super Admin
- `branch_<id>` — Order Handlers belonging to that branch

`emitToBranch(branchId, event, payload)` sends to **both** the branch's
room *and* `super-admins`, so handlers see only their branch's events
while Super Admins see everything.

Events:
- `order:new` — a customer placed an order in this branch
- `order:claimed` — a handler picked an order (`{orderId, claimedById, claimedByName}`)
- `order:updated` — an order's status changed

Picking calls `PATCH /orders/:id/claim`, atomic via `updateMany` guarded
by `status:'PENDING', claimedById:null` — only the first handler in the
matching branch wins; the rest get `409`.

### Frontend: one shared socket, site-wide alerts

`AdminSocketProvider` (`context/AdminSocketContext.jsx`) wraps the admin
portal. It opens **one** Socket.IO connection for the whole session and:

- Listens for `order:new` site-wide → plays a WebAudio "ping" and pops a
  toast in the top-right that links to `/admin/orders`. Works on every
  admin page (Dashboard, Reports, Branches, …) — not just Orders.
- Exposes the socket via `useAdminSocket()` so `Orders.jsx` and
  `IncomingOrders.jsx` consume the **same** connection instead of
  opening their own.

### Local-only dev server

`frontend/vite.config.local.mjs` is a one-off Vite config that proxies
to `localhost:4000` (port `5174`). Use it when the main `vite.config.js`
points at staging/Render but you need to test against your local backend:
`npx vite --config vite.config.local.mjs`.

## Conventions that span multiple files

- **Order lifecycle**: `PENDING → ACCEPTED → DISPATCHED → CLOSED`, plus `CANCELLED`.
  Allowed transitions are defined **once** in `backend/src/utils/helpers.js`
  (`STATUS_FLOW`) and enforced in `routes/orders.js`. The frontend's `lib/orders.js`
  mirrors this for the UI — change both together.
- **SQLite has no Prisma enums** — `Order.status`, `Product` flags, etc. use plain
  `String`/`Boolean` columns. Don't add `enum` to `schema.prisma`.
- **Prices are never trusted from the client.** `POST /api/orders` recomputes the
  subtotal from current DB prices and the delivery charge from the chosen area.
- **Order history is immutable**: `OrderItem` snapshots `productName` and `price`.
  Deleting a product sets `OrderItem.productId` to null (`onDelete: SetNull`) so past
  orders survive.
- **Income** is recognised only when an order reaches `CLOSED`; reports use the
  order's `updatedAt` as the close date (see `routes/reports.js`).
- **Slugs** are auto-generated and de-duplicated by `makeUniqueSlug` — never set a
  slug by hand.
- **Re-skinning the store**: all colours/spacing are CSS variables in the `:root`
  block of `frontend/src/styles/global.css`. `admin.css` reuses them.

## Environment

`backend/.env` (copy from `.env.example`) holds `DATABASE_URL`, `PORT`, `JWT_SECRET`,
`ADMIN_EMAIL`/`ADMIN_PASSWORD` (used by the seed for the **Super Admin** account),
and `CLIENT_URL` (CORS origin).

The seed creates one account per role:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@nishani.local` | `admin123` |
| Order Handler | `orders@nishani.local` | `orders123` |
| Product/Offer Manager | `products@nishani.local` | `products123` |
