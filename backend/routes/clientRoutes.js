import express from "express";
import {
  getClient,
  getClientById,
  createClient,
} from "../controllers/clientController.js";

const router = express.Router();

router.get("/clients", getClient);

router.get("/clients/:id", getClientById);

router.post("/clients", createClient);

export default router;
