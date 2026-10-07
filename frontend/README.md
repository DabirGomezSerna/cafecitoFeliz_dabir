# Cafecito Feliz — frontend

Create React App client for the café's point of sale. See the [root ReadMe](../ReadMe.md)
for the project overview, the permission matrix, and how to run the backend.

```bash
npm install
npm start      # http://localhost:3000
npm run build
```

## Configuration

`REACT_APP_API_URL` points at the backend, and defaults to
`http://localhost:4000/api`. Copy `.env.example` to `.env` to change it.

**CRA does not hot-reload `.env`** — restart `npm start` after editing it, or the
old value stays compiled in.

## Layout

```
src/
  components/
    App/            router and provider nesting
    Cart/           cart line items
    Checkout/       SummarySection, the collapsible step panel
    LoginForm/      staff sign-in
    RegisterForm/   staff sign-up (always creates a vendor)
    List/           product grid
    ProductCard/    one product on the menu
    Sale/           ClientPicker — customer lookup and inline creation
    common/         Button, Input, Badge, Icon, Loading, ErrorMessage
  context/
    AuthContext     session state; three-state status, see below
    CartContext     what is in the cart — never what it costs
  hooks/            useDebouncedValue
  layout/           Header, Layout
  pages/
    Home            the only public screen
    Login Register
    Cart Checkout   the sale flow
    Ticket          receipt, keyed by sale id
    Admin/          product management and sales history
    ProtectedRoute  route gate
  services/         axios client and one module per resource
  utils/            money and ticket formatting, cart to wire format
```

## Two rules worth knowing before editing

**No money is calculated here.** Prices, line totals, discounts and totals all
come from the backend — `POST /api/sales/quote` for a cart in progress, and the
stored sale for a ticket. `utils/money.js` formats numbers; it must never do
arithmetic. The quickest way to check you have not broken this:

```bash
grep -rnE "price\s*\*|\*\s*quantity|taxRate" src/
```

That should return nothing.

**The session cookie is httpOnly,** so JavaScript cannot read it and there is no
synchronous way to know whether someone is signed in. `AuthContext` answers the
question by calling `GET /api/auth/me`, and exposes `status` as
`"loading" | "authenticated" | "anonymous"`. `ProtectedRoute` waits during
`"loading"` — collapsing that into `"anonymous"` would redirect a signed-in
cashier to the login page on every hard refresh.
