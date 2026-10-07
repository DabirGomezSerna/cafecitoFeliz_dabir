import HttpError from "../utils/HttpError.js";
import serializeError from "../utils/serializeError.js";

/**
 * The single error handler. MUST take four arguments — that is the only way
 * Express recognizes error middleware. A three-argument version is treated as
 * ordinary middleware and silently skipped for errors, which is exactly what
 * happened before this file existed: every next(error) in every controller fell
 * through to Express's default handler and returned an HTML stack trace where
 * the frontend expected JSON.
 *
 * Mount LAST, after the 404 handler.
 *
 * Response shape is always { message, code, details? } so the frontend's
 * classifyError() in services/apiClient.js has one contract to parse.
 */
// eslint-disable-next-line no-unused-vars -- `next` is required for Express to see 4 args
const errorHandler = (err, req, res, next) => {
  let status = 500;
  let message = "Something went wrong";
  let code = "INTERNAL_ERROR";
  let details;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    code = err.code ?? "ERROR";
    details = err.details;
  } else if (err?.name === "ValidationError") {
    // Mongoose schema validation (required, min, enum, minlength...)
    status = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    details = Object.values(err.errors ?? {}).map((e) => ({
      path: e.path,
      msg: e.message,
    }));
  } else if (err?.name === "CastError") {
    // A value that could not be coerced to its schema type, e.g. a bad ObjectId.
    status = 400;
    message = "Invalid value";
    code = "INVALID_VALUE";
    details = { path: err.path };
  } else if (err?.code === 11000) {
    // Unique index violation. keyPattern tells us which field collided, which is
    // what makes a duplicate client email reportable as "email already taken"
    // rather than a generic conflict.
    const field = Object.keys(err.keyPattern ?? {})[0];
    status = 409;
    message = field ? `That ${field} is already registered` : "Duplicate value";
    code = "DUPLICATE_KEY";
    details = field ? { field } : undefined;
  } else if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired session";
    code = "BAD_SESSION";
  }

  // Log unexpected failures loudly; expected ones (4xx) are routine traffic and
  // would otherwise drown the signal.
  if (status >= 500) {
    console.error("[error]", req.method, req.originalUrl, serializeError(err));
  }

  const body = { message, code };
  if (details !== undefined) body.details = details;

  // Never leak a stack trace to a client in production.
  if (status >= 500 && process.env.NODE_ENV !== "production" && err?.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};

export default errorHandler;
