# 🍦 Nishani — Online Ordering Website

A reusable, single-store online-ordering website with a full admin portal.
Built as a clean template you can re-skin and re-use for any food/retail business.

- **Storefront** — browse categories, view products, cart, Cash-on-Delivery
  checkout, live order tracking, blog, FAQs, privacy page.
- **Admin portal** (`/admin`) — manage everything from one place.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Database | SQLite via Prisma ORM |
| Auth | JWT (admin only) |
| Payments | Cash on Delivery |

## Project layout

```
nishani/
├── backend/     Express + Prisma REST API   (port 4000)
└── frontend/    React storefront + admin    (port 5173)
```

## Getting started

You need **Node.js 18+**. Open two terminals.

**1. Backend**
```bash
cd backend
npm install
npm run setup     # creates the SQLite DB + sample data
npm run dev       # API on http://localhost:4000
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev       # site on http://localhost:5173
```

Open **http://localhost:5173** for the store and **http://localhost:5173/admin**
for the portal.

### Admin logins (one account per role)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@nishani.local` | `admin123` |
| Order Handler | `orders@nishani.local` | `orders123` |
| Product / Offer Manager | `products@nishani.local` | `products123` |

Change the Super Admin credentials in `backend/.env` before running `npm run setup`.
The Super Admin creates all other accounts from **Admin Users** in the portal.

## Admin portal features

| # | Feature | Where |
|---|---|---|
| 1 | Add products with image, cover images, description & price | Products → Add product |
| 2 | Delete products / mark out of stock | Products list |
| 3 | Create offer images & videos | Offers |
| 4 | Monthly income from the online store | Dashboard & Reports |
| 5 | Download orders as an Excel sheet | Reports |
| 6 | Accept & dispatch orders | Orders |
| 7 | Close (complete) orders | Orders / Order detail |

Plus: categories & delivery-area management, and a dashboard with live stats.

## Roles & permissions (RBAC)

The admin portal has three roles. Each admin sees only the menu items and pages
their role allows; the backend enforces every rule independently.

| Capability | Super Admin | Order Handler | Product / Offer Manager |
|---|:---:|:---:|:---:|
| Create & manage admin users | ✓ | — | — |
| Process orders (accept / dispatch / close / cancel) | ✓ | ✓ | — |
| Add / edit / delete products | ✓ | — | ✓ |
| Mark products out of stock | ✓ | ✓ | ✓ |
| Create offers (image / video) | ✓ | — | ✓ |
| Manage categories | ✓ | — | ✓ |
| Manage delivery areas | ✓ | ✓ | — |
| View income & download reports | ✓ | — | — |

Order Handlers and Product/Offer Managers support **multiple accounts** — the
Super Admin creates as many as the business needs.

## Live order handling (realtime + multi-branch)

The platform supports **multiple physical branches**. Each delivery area is
mapped to a branch; an order placed in that area is routed to that branch.

- Order Handlers belong to **one** branch and only see — in their feed, on the
  Orders table, in the toast notifications — orders routed to it.
- Super Admins see every branch's events.
- The moment a customer checks out, the order **drops in as a card** on every
  Order Handler of that branch (and every Super Admin), in real time.
- A handler clicks **"Pick this order"** to claim it. It instantly
  **disappears from every other handler in that branch**. If two click at the
  same moment, only the first wins; the other sees *"already picked by …"*.
- A **site-wide alert** (toast + audio ping) fires on *any* admin page — so a
  handler viewing the Dashboard or Reports still hears a new order arrive.

## How an order flows

```
Customer places order        →  PENDING
Admin accepts                →  ACCEPTED
Admin dispatches             →  DISPATCHED
Admin closes (delivered)     →  CLOSED      ← counted as income
                              (or CANCELLED at any earlier step)
```

Customers track their order live at `/track` using the order number shown at checkout.

## Re-using this template for another store

1. Edit the CSS variables at the top of `frontend/src/styles/global.css`
   (brand colour, etc.) and the logo text in the layout components.
2. Run `npm run db:seed` after editing `backend/prisma/seed.js`, or just add your
   real products through the admin portal.
3. Set a strong `JWT_SECRET` and real admin credentials in `backend/.env`.

## Notes

- Uploaded images/videos are stored in `backend/uploads/`.
- `npm run db:seed` **wipes and repopulates** the database — don't run it on live data.
- See `CLAUDE.md` for architecture details and conventions.
