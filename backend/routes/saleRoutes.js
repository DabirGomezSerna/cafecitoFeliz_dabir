import express from "express";
import {
  quoteSale,
  createSale,
  getSaleById,
  getSales,
} from "../controllers/saleController.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/** Ringing up a sale is the core salesperson task; admins can do it too. */
const staff = [requireAuth, requireRole("admin", "vendor")];

/** Reviewing the business's sales history is an administrator's job. */
const adminOnly = [requireAuth, requireRole("admin")];

// There is deliberately no update or delete: a sale is a financial record.
// Correcting one is a business process (a refund or offsetting entry), not an edit.

// Declared before "/sales/:id" so "quote" is never parsed as an id — Express
// matches in declaration order, and validateObjectId would otherwise reject it.
router.post("/sales/quote", ...staff, quoteSale);

router.post("/sales", ...staff, createSale);

// Admin-only: a salesperson should not be able to read the whole revenue history.
router.get("/sales", ...adminOnly, getSales);

// A salesperson can still read an individual ticket, e.g. the one they just made.
router.get("/sales/:id", ...staff, validateObjectId("id"), getSaleById);

export default router;
