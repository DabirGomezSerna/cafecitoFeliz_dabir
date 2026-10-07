import express from "express";
import {
  quoteSale,
  createSale,
  getSaleById,
  getSales,
} from "../controllers/saleController.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

// Auth is mounted in a later phase. Intended permissions:
//   POST /sales/quote  admin + vendor
//   POST /sales        admin + vendor
//   GET  /sales/:id    admin + vendor
//   GET  /sales        ADMIN ONLY
//
// There is no update or delete: a sale is a financial record. Correcting one is
// a business process (a refund or an offsetting entry), not an edit.

// Declared before "/sales/:id" so "quote" is never parsed as an id. (Express 5
// matches in declaration order, and validateObjectId would otherwise reject it.)
router.post("/sales/quote", quoteSale);

router.post("/sales", createSale);

router.get("/sales", getSales);

router.get("/sales/:id", validateObjectId("id"), getSaleById);

export default router;
