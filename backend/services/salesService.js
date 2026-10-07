import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Client from "../models/Client.js";
import HttpError from "../utils/HttpError.js";
import round2 from "../utils/round2.js";
import { priceSale } from "./pricing.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THERE IS NO TRANSACTION HERE — read before "fixing" this
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Committing a sale touches three documents: it decrements stock on N products,
 * inserts the Sale, and increments the client's purchase count. Textbook advice
 * is to wrap that in session.withTransaction().
 *
 * That does not work on this project's default database. MongoDB multi-document
 * transactions require a replica set or a sharded cluster; against a standalone
 * mongod — which is what mongodb://localhost:27017 is — the driver throws:
 *
 *     MongoServerError: Transaction numbers are only allowed on a replica set
 *     member or mongos
 *
 * So adding a session would make this code fail on the one database every
 * developer here actually runs. Instead we use a compare-and-set reservation
 * with compensation, which behaves identically on standalone and replica sets.
 *
 * The guarantee that matters is that stock cannot go negative and two cashiers
 * cannot both sell the last unit. That is provided by the conditional update in
 * reserveStock(): matching on `stock: { $gte: quantity }` and applying `$inc` in
 * one operation is atomic at the single-document level, which is something
 * standalone mongod does support. If the filter does not match, nothing is
 * written and we get modifiedCount 0 — a clean 409 rather than an oversell.
 *
 * What this does NOT give us is all-or-nothing across the three steps, so every
 * failure after a successful reservation triggers compensation (give the units
 * back). The residual exposure is a process crash during compensation itself,
 * which would leave stock under-counted; it is logged loudly.
 *
 * If you want real atomicity, the upgrade path is to run Mongo as a single-node
 * replica set rather than to add a session to this file:
 *     mongod --replSet rs0   then   rs.initiate()
 *     DB_CONNECTION_STRING=mongodb://localhost:27017/cafecito-pos?replicaSet=rs0&directConnection=true
 * and only then switch to withTransaction.
 */

/** The populate chain every read of a Sale uses, so one resource has one shape. */
const withRefs = (query) => query.populate("client").populate("products.product");

export const findSaleById = (id) => withRefs(Sale.findById(id));

export const listSales = ({ limit = 100 } = {}) =>
  withRefs(Sale.find().sort({ createdAt: -1 }).limit(limit));

/**
 * Atomically reserve stock for one line.
 *
 * Returns true if the units were taken. Returns false if the product no longer
 * has enough — never throws for that case, so the caller controls the error.
 *
 * Do NOT rewrite this as read-then-write:
 *     const p = await Product.findById(id);
 *     if (p.stock >= qty) { p.stock -= qty; await p.save(); }
 * Two concurrent requests both read the old stock and both save, overselling.
 */
async function reserveStock({ product, quantity }) {
  const result = await Product.updateOne(
    { _id: product, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
  );
  return result.modifiedCount === 1;
}

/** Return previously reserved units. Best-effort: logs rather than throws. */
async function releaseStock(reserved) {
  for (const line of reserved) {
    try {
      await Product.updateOne(
        { _id: line.product },
        { $inc: { stock: line.quantity } },
      );
    } catch (error) {
      console.error(
        "[commitSale] stock compensation FAILED — stock is now under-counted",
        { product: line.product, quantity: line.quantity, error: error.message },
      );
    }
  }
}

/**
 * Price, validate and persist a sale.
 *
 * @param {object}   args
 * @param {Array}    args.items          [{ product, quantity }]
 * @param {?string}  args.clientId       optional client ObjectId
 * @param {?number}  args.expectedTotal  the total the cashier was shown, if any
 *
 * @returns {Promise<Sale>} the populated, persisted sale
 *
 * @throws {HttpError} whatever priceSale throws, plus 409 PRICE_CHANGED
 */
export async function commitSale({ items, clientId = null, expectedTotal = null }) {
  // Prices, discount and stock sufficiency all come from the shared authority.
  const { quote, internals } = await priceSale({ items, clientId });

  /**
   * Optimistic concurrency guard.
   *
   * A quote reserves nothing. Between the cashier reading a total aloud and
   * pressing confirm, an admin could change a price. Without this check the
   * ticket would silently total something other than what was quoted, which for
   * a point of sale is worse than a visible error.
   */
  if (expectedTotal !== null && expectedTotal !== undefined) {
    const expected = round2(expectedTotal);
    if (expected !== quote.total_price) {
      throw new HttpError(409, "Prices changed, please review the sale", {
        code: "PRICE_CHANGED",
        details: { quoted: expected, current: quote.total_price },
      });
    }
  }

  const reserved = [];

  try {
    for (const line of quote.lines) {
      const ok = await reserveStock(line);

      if (!ok) {
        // Lost a race against a concurrent sale, or stock changed since pricing.
        throw new HttpError(409, "Insufficient stock", {
          code: "INSUFFICIENT_STOCK",
          details: [
            {
              product: line.product,
              name: line.name,
              requested: line.quantity,
            },
          ],
        });
      }

      reserved.push(line);
    }

    // Persist using the backend's own numbers only.
    const sale = await Sale.create({
      client: internals.clientDoc?._id ?? null,
      products: quote.lines.map((line) => ({
        product: line.product,
        name: line.name,
        quantity: line.quantity,
        price: line.unit_price,
        // Stored so no consumer ever has to multiply money itself.
        line_total: line.line_total,
      })),
      subtotal: quote.subtotal,
      discount: quote.discount_rate,
      discount_amount: quote.discount_amount,
      total_price: quote.total_price,
    });

    /**
     * Advance the loyalty counter only after the sale exists, so the discount
     * just applied was based on the count before this purchase. A client's first
     * sale is therefore undiscounted and leaves them at 1, qualifying them for
     * 5% next time.
     */
    if (internals.clientDoc) {
      await Client.updateOne(
        { _id: internals.clientDoc._id },
        { $inc: { purchases: 1 } },
      );
    }

    return findSaleById(sale._id);
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }
}
