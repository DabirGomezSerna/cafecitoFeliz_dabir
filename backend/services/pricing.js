import mongoose from "mongoose";

import Product from "../models/Product.js";
import Client from "../models/Client.js";
import HttpError from "../utils/HttpError.js";
import round2 from "../utils/round2.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SINGLE PRICING AUTHORITY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This module is the ONLY place in the codebase where a price is multiplied,
 * summed, or discounted. Not the controllers, not the frontend.
 *
 * The rule it enforces: a caller supplies only WHAT they want (product ids and
 * quantities) and optionally WHO is buying (a client id). Every number —
 * unit prices, line totals, the discount rate, the total — is derived here from
 * the database. Nothing monetary is ever read out of a request body.
 *
 * The previous implementation did the opposite: it read `products[i].price`
 * straight from the request, so a caller could buy a 349.99 coffee for 0.01, and
 * derived the loyalty discount from `client.purchases` in the request body, so a
 * caller could claim any discount tier. (That ladder was also dead in practice:
 * `client` is an ObjectId ref, so for the idiomatic payload `client: "<id>"` the
 * expression `client.purchases` was `undefined`, every comparison was false, and
 * the discount silently stayed 0.)
 *
 * Both POST /api/sales and POST /api/sales/quote call priceSale(), so a quote
 * and the sale it becomes cannot disagree.
 */

/**
 * Loyalty discount tiers, keyed on the client's purchase count BEFORE the sale
 * being priced. Ordered high → low so the first match wins.
 *
 * A client's first-ever purchase therefore gets 0%: at that moment purchases is
 * still 0, and it is only incremented once the sale is committed. Their second
 * visit gets 5%.
 */
export const DISCOUNT_TIERS = Object.freeze([
  { minPurchases: 8, rate: 0.15 },
  { minPurchases: 4, rate: 0.1 },
  { minPurchases: 1, rate: 0.05 },
  { minPurchases: 0, rate: 0 },
]);

/**
 * Resolve a purchase count to a discount rate.
 *
 * Takes the floor of the count so a non-integer (or negative) value can never
 * fall through every tier and return undefined, which the original if/else-if
 * chain would have done for e.g. 0.5.
 */
export function discountRateFor(purchases) {
  const n = Number(purchases);
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return DISCOUNT_TIERS.find((tier) => count >= tier.minPurchases).rate;
}

/**
 * Validate and canonicalize the requested line items.
 *
 * Accepts `[{ product, quantity }]`. Duplicate product ids are merged by summing
 * their quantities — two cart rows for the same coffee must become one line, or
 * the stock check would pass on each row independently while the sale as a whole
 * oversells.
 *
 * @throws {HttpError} 400 INVALID_ITEMS
 */
export function normalizeItems(rawItems) {
  const bad = (message, details) =>
    new HttpError(400, message, { code: "INVALID_ITEMS", details });

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw bad("A sale needs at least one product");
  }

  const merged = new Map();

  rawItems.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw bad(`Item ${index} is not an object`, { index });
    }

    // Accept a bare id string too, so callers may send ["<id>"]-shaped items
    // without a wrapper object.
    const productId = typeof item === "string" ? item : item.product;

    if (!mongoose.isValidObjectId(productId)) {
      throw bad(`Item ${index} has an invalid product id`, {
        index,
        product: productId ?? null,
      });
    }

    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw bad(`Item ${index} needs a whole quantity of at least 1`, {
        index,
        quantity: item.quantity ?? null,
      });
    }

    const key = String(productId);
    merged.set(key, (merged.get(key) ?? 0) + quantity);
  });

  return [...merged].map(([product, quantity]) => ({ product, quantity }));
}

/**
 * Price a prospective sale against current database state.
 *
 * @param {object}  args
 * @param {Array}   args.items     [{ product: "<ObjectId>", quantity: int >= 1 }]
 * @param {?string} args.clientId  ObjectId string, or null for an anonymous sale
 *
 * @returns {Promise<{quote: object, internals: object}>}
 *   `quote`     — the literal response body of POST /api/sales/quote. The
 *                 controller serializes it as-is, with no field picking, so the
 *                 numbers a cashier reads and the numbers stored on the Sale
 *                 cannot drift apart: there is no second code path to drift.
 *   `internals` — never serialized. Loaded documents handed to commitSale() so
 *                 it does not re-query what was just fetched.
 *
 * @throws {HttpError} 400 INVALID_ITEMS | 404 PRODUCT_NOT_FOUND |
 *                     404 CLIENT_NOT_FOUND | 409 INSUFFICIENT_STOCK
 */
export async function priceSale({ items, clientId = null }) {
  const normalized = normalizeItems(items);

  // ── Products ───────────────────────────────────────────────────────────────
  const ids = normalized.map((line) => line.product);
  const products = await Product.find({ _id: { $in: ids } });

  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const missing = ids.filter((id) => !productsById.has(id));
  if (missing.length > 0) {
    throw new HttpError(404, "Product not found", {
      code: "PRODUCT_NOT_FOUND",
      details: missing,
    });
  }

  // ── Stock ──────────────────────────────────────────────────────────────────
  // Collect EVERY offending line before throwing, so a cashier can correct the
  // whole cart in one pass instead of discovering problems one at a time.
  //
  // This check is advisory. It produces a good error message, but it is a read
  // and another sale could consume the stock a millisecond later. The actual
  // guarantee against overselling is the conditional update in salesService.js.
  const shortages = normalized
    .map((line) => {
      const product = productsById.get(line.product);
      return product.stock >= line.quantity
        ? null
        : {
            product: line.product,
            name: product.name,
            requested: line.quantity,
            available: product.stock,
          };
    })
    .filter(Boolean);

  if (shortages.length > 0) {
    throw new HttpError(409, "Insufficient stock", {
      code: "INSUFFICIENT_STOCK",
      details: shortages,
    });
  }

  // ── Client (optional) ──────────────────────────────────────────────────────
  let clientDoc = null;

  if (clientId !== null && clientId !== undefined && clientId !== "") {
    if (!mongoose.isValidObjectId(clientId)) {
      throw new HttpError(400, "Invalid client id", {
        code: "INVALID_CLIENT_ID",
        details: { client: clientId },
      });
    }

    clientDoc = await Client.findById(clientId);

    if (!clientDoc) {
      throw new HttpError(404, "Client not found", {
        code: "CLIENT_NOT_FOUND",
        details: { client: String(clientId) },
      });
    }
  }

  // ── Money ──────────────────────────────────────────────────────────────────
  // The discount rate comes from the loaded Client document, never from input.
  const discount_rate = discountRateFor(clientDoc?.purchases ?? 0);

  const lines = normalized.map((line) => {
    const product = productsById.get(line.product);
    // Price and name are snapshotted from the database at sale time.
    const unit_price = round2(product.price);

    return {
      product: String(product._id),
      name: product.name,
      unit_price,
      quantity: line.quantity,
      line_total: round2(unit_price * line.quantity),
      stock_available: product.stock,
    };
  });

  const subtotal = round2(lines.reduce((sum, line) => sum + line.line_total, 0));
  const discount_amount = round2(subtotal * discount_rate);
  const total_price = round2(subtotal - discount_amount);

  return {
    quote: {
      lines,
      subtotal,
      discount_rate,
      discount_amount,
      total_price,
      client: clientDoc
        ? {
            _id: String(clientDoc._id),
            display_name: clientDoc.display_name,
            email: clientDoc.email,
            // Count BEFORE this sale — this is what produced discount_rate.
            purchases: clientDoc.purchases,
          }
        : null,
    },
    internals: { productsById, clientDoc },
  };
}
