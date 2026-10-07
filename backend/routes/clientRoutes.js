import express from "express";
import {
  getClient,
  getClientById,
  createClient,
} from "../controllers/clientController.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Customer records are staff-only: this is the project's real PII surface.
// Applied to every route in this file rather than per-route, so a route added
// later is protected by default instead of accidentally public.
router.use("/clients", requireAuth, requireRole("admin", "vendor"));

router.get("/clients", getClient);

router.get("/clients/:id", validateObjectId("id"), getClientById);

router.post("/clients", createClient);

// Deliberately no update or delete: a client's purchase history is a business
// record, and removing one would silently rewrite past sales.

export default router;
