import express from "express";
import productRoutes from "./productRoutes.js";
import clientRoutes from "./clientRoutes.js";
import saleRoutes from "./saleRoutes.js";

const router = express.Router();

router.use(productRoutes);
router.use(clientRoutes);
router.use(saleRoutes);

export default router;
