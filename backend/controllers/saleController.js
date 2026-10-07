import HttpError from "../utils/HttpError.js";
import { priceSale } from "../services/pricing.js";
import { commitSale, findSaleById, listSales } from "../services/salesService.js";

/**
 * These handlers deliberately contain no arithmetic. All pricing, discounting and
 * validation lives in services/pricing.js, so a quote and the sale it becomes are
 * computed by the same code. See the header comment there.
 *
 * Request bodies carry only { items, client, expected_total } — never prices.
 */

/**
 * POST /api/sales/quote
 *
 * Prices a prospective sale without persisting anything. Feeds every monetary
 * figure the cart and checkout screens display, so the frontend never computes
 * money itself.
 */
const quoteSale = async (req, res, next) => {
  try {
    const { items, client } = req.body;

    const { quote } = await priceSale({ items, clientId: client ?? null });

    // Serialized as-is: no field picking, so the quote the cashier sees and the
    // numbers stored on the Sale cannot diverge.
    res.status(200).json(quote);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sales
 *
 * Commits the sale: reserves stock, stores the sale with server-computed totals,
 * and advances the client's loyalty counter.
 */
const createSale = async (req, res, next) => {
  try {
    const { items, client, expected_total } = req.body;

    const sale = await commitSale({
      items,
      clientId: client ?? null,
      expectedTotal: expected_total ?? null,
    });

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

/** GET /api/sales/:id */
const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await findSaleById(id);

    if (!sale) {
      throw new HttpError(404, "Sale not found", { code: "SALE_NOT_FOUND" });
    }

    res.status(200).json(sale);
  } catch (error) {
    next(error);
  }
};

/** GET /api/sales — admin only; newest first. */
const getSales = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const sales = await listSales({ limit });

    res.status(200).json(sales);
  } catch (error) {
    next(error);
  }
};

export { quoteSale, createSale, getSaleById, getSales };
