/**
 * An error carrying an HTTP status, so controllers and services can signal
 * intent ("this is a 409") without knowing anything about `res`.
 *
 * The error handler in middleware/errorHandler.js recognizes this class and
 * serializes it as { message, code, details }. Anything thrown that is NOT an
 * HttpError is treated as an unexpected failure and reported as a 500, so
 * never use HttpError for genuine bugs — let those throw naturally.
 *
 * `code` is a stable machine-readable string for the frontend to branch on
 * (INSUFFICIENT_STOCK, PRICE_CHANGED, ...). `message` is human-facing and may
 * change freely; `code` should not.
 */
class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (code) this.code = code;
    if (details !== undefined) this.details = details;

    // Keep this constructor out of the reported stack.
    Error.captureStackTrace?.(this, HttpError);
  }
}

export default HttpError;
