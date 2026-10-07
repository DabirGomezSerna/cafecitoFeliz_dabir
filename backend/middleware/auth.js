import HttpError from "../utils/HttpError.js";
import { COOKIE_NAME, verifyToken } from "../utils/jwt.js";

/**
 * Require a valid session. Populates req.user with { id, role, display_name }.
 *
 * Stateless by design: the role is read from the signed token, so a protected
 * request costs zero database queries. See utils/jwt.js for the consequence
 * (role changes apply only after re-login).
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return next(
      new HttpError(401, "Authentication required", { code: "NO_SESSION" }),
    );
  }

  try {
    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role,
      display_name: payload.display_name,
    };

    next();
  } catch {
    // Covers both a tampered signature and an expired token.
    next(new HttpError(401, "Invalid or expired session", { code: "BAD_SESSION" }));
  }
}

/**
 * Require one of the given roles. MUST be mounted after requireAuth, since it
 * reads req.user. Mounted alone it rejects everyone, which fails closed.
 *
 *   router.post("/products", requireAuth, requireRole("admin"), createProduct)
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(
        new HttpError(401, "Authentication required", { code: "NO_SESSION" }),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(403, "Insufficient permissions", {
          code: "FORBIDDEN",
          details: { required: roles, actual: req.user.role },
        }),
      );
    }

    next();
  };
