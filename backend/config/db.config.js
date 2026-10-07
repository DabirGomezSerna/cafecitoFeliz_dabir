import mongoose from "mongoose";
import dotenv from "dotenv";
import serializeError from "../utils/serializeError.js";

dotenv.config();

mongoose.connection.on("error", (error) =>
  console.error("MongoDB connection error", { error: serializeError(error) }),
);
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));

/**
 * Resolve the connection string.
 *
 * DB_CONNECTION_STRING is the name actually used in .env. An earlier version of
 * this file read MONGODB_URI, which was never defined anywhere — so the `||`
 * fallback silently won every time and the app has only ever talked to a local
 * mongod, regardless of what .env said. MONGODB_URI is still accepted as an
 * alias so either name works, but DB_CONNECTION_STRING takes precedence.
 */
const resolveUri = () =>
  process.env.DB_CONNECTION_STRING ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/cafecito-pos";

/**
 * Connect to MongoDB. Throws on failure rather than calling process.exit, so the
 * caller decides what a dead database means — server.js treats it as fatal, but
 * a test or a script may want to handle it differently.
 */
const connectDB = async () => {
  const uri = resolveUri();

  try {
    const connection = await mongoose.connect(uri);
    console.log("MongoDB connected", {
      host: connection.connection.host,
      database: connection.connection.name,
    });
    return connection;
  } catch (error) {
    // Wrap rather than swallow: the original code logged through an undefined
    // serializeError(), which threw a ReferenceError from inside the catch and
    // destroyed the very cause it was trying to report.
    console.error("MongoDB connection failed", { error: serializeError(error) });
    throw new Error(`Could not connect to MongoDB: ${error.message}`, { cause: error });
  }
};

export default connectDB;
