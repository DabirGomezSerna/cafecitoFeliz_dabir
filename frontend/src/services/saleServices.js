import apiClient from "./apiClient";

/**
 * Sales.
 *
 * Every request here sends only ids and quantities. Prices, discounts and totals
 * always come back from the server and are never sent to it.
 */

/**
 * Price a cart without committing anything.
 *
 * This is what the cart and checkout screens display, so the cashier reads the
 * same numbers the sale will actually use — including the loyalty discount, which
 * the frontend has no way to compute for itself.
 *
 * @param {{items: Array<{product: string, quantity: number}>, client: ?string}} payload
 * @returns the quote: { lines, subtotal, discount_rate, discount_amount, total_price, client }
 */
export async function quoteSale({ items, client = null }) {
  const response = await apiClient.post("/sales/quote", { items, client });
  return response.data;
}

/**
 * Commit the sale.
 *
 * `expected_total` is the total the cashier was shown. The server rejects the
 * sale with 409 PRICE_CHANGED if it no longer matches, so a ticket can never
 * silently charge something other than what was quoted aloud.
 */
export async function createSale({ items, client = null, expected_total = null }) {
  const response = await apiClient.post("/sales", {
    items,
    client,
    expected_total,
  });
  return response.data;
}

/** Fetch one sale, populated. Used by the ticket screen. */
export async function getSaleById(id) {
  const response = await apiClient.get(`/sales/${id}`);
  return response.data;
}

/** List sales, newest first. Admin only — a vendor receives 403. */
export async function listSales({ limit } = {}) {
  const response = await apiClient.get("/sales", {
    params: limit ? { limit } : undefined,
  });
  return response.data;
}
