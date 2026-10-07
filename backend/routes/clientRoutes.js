import express from "express";
import {
  getClient,
  getClientById,
  createClient,
} from "../controllers/clientController.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

// Auth is mounted in a later phase. All three are intended for admin + vendor.
// There is deliberately no update or delete: a client's purchase history is a
// business record, and deleting one would silently rewrite past sales.
router.get("/clients", getClient);

router.get("/clients/:id", validateObjectId("id"), getClientById);

router.post("/clients", createClient);

export default router;
