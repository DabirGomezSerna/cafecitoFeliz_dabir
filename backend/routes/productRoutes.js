import express from "express";
import {
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

// Auth is mounted in a later phase. Intended permissions:
//   GET    /products      public
//   POST   /products      admin only
//   PUT    /products/:id  admin only
//   DELETE /products/:id  admin only
router.get("/products", getProduct);

router.post("/products", createProduct);

router.put("/products/:id", validateObjectId("id"), updateProduct);

router.delete("/products/:id", validateObjectId("id"), deleteProduct);

export default router;
