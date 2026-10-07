import express from "express";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import clientRoutes from "./clientRoutes.js";
import saleRoutes from "./saleRoutes.js";

const router = express.Router();

// Auth first, so reading this file top-to-bottom shows the unauthenticated
// surface before everything that sits behind it.
router.use(authRoutes);
router.use(productRoutes);
router.use(clientRoutes);
router.use(saleRoutes);

export default router;
