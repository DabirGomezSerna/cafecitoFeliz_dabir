import mongoose from "mongoose";
import HttpError from "../utils/HttpError.js";

/**
 * Rejects a malformed route param before it reaches Mongoose.
 *
 * Without this, `GET /api/products/not-an-id` reaches Product.findById(), which
 * throws a CastError. The error handler does map CastError to 400, so the status
 * would be right either way — but the message would leak Mongoose internals
 * ("Cast to ObjectId failed for value ..."), and the DB would be hit for a
 * request that was never valid. Failing here keeps the message ours.
 *
 * Usage: router.get("/products/:id", validateObjectId("id"), getProductById)
 */
const validateObjectId =
  (param = "id") =>
  (req, res, next) => {
    const value = req.params[param];

    if (!mongoose.isValidObjectId(value)) {
      return next(
        new HttpError(400, "Invalid identifier", {
          code: "INVALID_ID",
          details: { param, value },
        }),
      );
    }

    next();
  };

export default validateObjectId;
