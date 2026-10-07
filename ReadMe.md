# Cafecito Feliz

Point-of-sale for a small café, used by the shop's own staff. Customers never log
in; the only page a member of the public can reach is the product list.

- `backend/` — Express 5 + Mongoose REST API, mounted under `/api`
- `frontend/` — Create React App client

## Running it

```bash
# API
cd backend
npm install
cp .env.example .env     # then fill in JWT_SECRET, see below
npm run seed             # creates the bootstrap admin, clients and products
npm run dev              # http://localhost:4000

# Client
cd frontend
npm install
npm start                # http://localhost:3000
```

The backend refuses to start without `JWT_SECRET`. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Note that Create React App does **not** hot-reload `.env` — restart `npm start`
after changing `REACT_APP_API_URL`.

## Roles and permissions

Two roles: `vendor` (a salesperson) and `admin`.

| Action | Route | Who |
|---|---|---|
| See products | `GET /api/products` | anyone, no login |
| Create / update / delete products | `POST`/`PUT`/`DELETE /api/products` | admin |
| See / create clients | `GET`/`POST /api/clients` | admin + vendor |
| Quote a sale | `POST /api/sales/quote` | admin + vendor |
| Create a sale | `POST /api/sales` | admin + vendor |
| See one sale | `GET /api/sales/:id` | admin + vendor |
| List all sales | `GET /api/sales` | admin |

Sales have no update or delete route: a sale is a financial record, and
correcting one is a business process rather than an edit. Clients have no delete
route for the same reason — removing one would silently rewrite past sales.

## Creating staff accounts

`POST /api/auth/register` is public, and **always** forces the `vendor` role. A
request body containing `{"role":"admin"}` is ignored. Nothing in the running
application can create an administrator.

So the seed script is the only bootstrap path:

```bash
# Override the defaults in .env before running
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='something strong' npm run seed
```

### Promoting someone to admin

This is a deliberate manual step:

```js
// mongosh cafecito-pos
db.users.updateOne({ email: "someone@example.com" }, { $set: { role: "admin" } })
```

**The promoted user must then log out and log back in.** A user's role is carried
inside their session token, and the token is trusted without a database lookup so
that protected requests cost no extra queries. Their existing token still says
`vendor` until it expires — up to `JWT_EXPIRES_IN`, which defaults to 7 days.

The same applies in reverse: **demotion is not immediate either.** Revoking
someone's admin rights leaves them an admin until their token expires. If that
matters for your deployment, either shorten `JWT_EXPIRES_IN` or change
`requireRole` in `backend/middleware/auth.js` to re-read the user's role from the
database on each request, at the cost of one query per protected call.

> Registration being public means anyone who can reach the server can create a
> working vendor account, and a vendor can read the full client list (names and
> emails). If that is a concern, the two cheapest mitigations are to require a
> shared signup code from `.env` in the register handler, and to restrict
> `GET /api/clients` to `?q=` searches with no bulk listing.

## All money is calculated by the backend

This is a hard rule, and the code is arranged to make breaking it difficult.

`backend/services/pricing.js` is the only place in the project where a price is
multiplied, summed, or discounted. A client sends only *what* is being bought
(product ids and quantities) and optionally *who* is buying (a client id). Every
unit price, line total, discount and total is read from the database.

`POST /api/sales/quote` prices a cart without saving anything, and is what the
cart and checkout screens display. `POST /api/sales` commits it. Both call the
same `priceSale()`, so a quote and the sale it becomes cannot disagree.

A quote reserves nothing, so `POST /api/sales` accepts an optional
`expected_total`. If prices moved in between, it fails with `409 PRICE_CHANGED`
rather than silently charging a different amount than the cashier was shown.

### Loyalty discount

Based on the client's purchase count **before** the current sale:

| Previous purchases | Discount |
|---|---|
| 0 | 0% |
| 1–3 | 5% |
| 4–7 | 10% |
| 8+ | 15% |

A client's first-ever purchase is therefore undiscounted, and leaves them at 1 —
qualifying them for 5% next time. The count is incremented only after the sale is
successfully stored, and is never accepted from a request body.

Sales store `discount` as a **rate** (`0.05` means 5%) alongside
`discount_amount`, the actual money taken off. Do not compute
`subtotal - discount`; that is wrong by a factor of 100.

## Database notes

Stock is taken with a conditional update (`stock: { $gte: quantity }` plus
`$inc`), which is atomic per document, so two cashiers cannot both sell the last
unit. There is deliberately **no** transaction: MongoDB multi-document
transactions require a replica set, and a standalone `mongod` — the default here —
rejects them outright. See the header comment in
`backend/services/salesService.js` before changing this.

### Migrations

`backend/scripts/migrate-client-display-name.js` repairs clients written by an
older seed script that used `displayName` instead of the schema's `display_name`.
Safe to re-run; supports `--dry-run`.
