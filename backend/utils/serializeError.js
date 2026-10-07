/**
 * Turn an Error into something console.log / JSON.stringify can actually show.
 *
 * `JSON.stringify(new Error("boom"))` yields "{}" because name/message/stack are
 * non-enumerable, which is how the original logging in db.config.js managed to
 * discard the cause of every connection failure. This pulls the useful fields
 * out explicitly, including the Mongo-specific ones and the `cause` chain.
 */
const serializeError = (error) => {
  if (!(error instanceof Error)) return { value: error };

  const out = {
    name: error.name,
    message: error.message,
  };

  // Mongo/Mongoose attach these; include them only when present.
  if (error.code !== undefined) out.code = error.code;
  if (error.codeName !== undefined) out.codeName = error.codeName;
  if (error.stack) out.stack = error.stack;
  if (error.cause) out.cause = serializeError(error.cause);

  return out;
};

export default serializeError;
