import express from "express";
import {
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Browsing the menu is public — the Home page is the one unauthenticated screen.
router.get("/products", getProduct);

// Managing the catalogue is an administrator's job.
router.post("/products", requireAuth, requireRole("admin"), createProduct);

router.put(
  "/products/:id",
  requireAuth,
  requireRole("admin"),
  validateObjectId("id"),
  updateProduct,
);

router.delete(
  "/products/:id",
  requireAuth,
  requireRole("admin"),
  validateObjectId("id"),
  deleteProduct,
);

export default router;
