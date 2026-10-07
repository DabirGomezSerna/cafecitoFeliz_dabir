import express from "express";
import { register, login, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Registration is public by product decision, and the controller forces the
// "vendor" role so it cannot be used to create an administrator.
router.post("/auth/register", register);

router.post("/auth/login", login);

// Idempotent, and safe to call without a session.
router.post("/auth/logout", logout);

// The session probe the frontend uses on boot, since it cannot read the
// httpOnly cookie itself.
router.get("/auth/me", requireAuth, me);

export default router;
