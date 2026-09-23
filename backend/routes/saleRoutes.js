import express from "express";
import { getSaleById, createSale } from "../controllers/saleController.js";

const router = express.Router();

router.get("/sales/:id", getSaleById);

router.post("/sales", createSale);

export default router;
