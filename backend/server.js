import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.config.js";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

/**
 * Fail fast on missing configuration.
 *
 * JWT_SECRET has no safe default: without this check jwt.sign() would be called
 * with `undefined` and throw on the first login attempt, or worse, a future
 * refactor adds a fallback and every token in production is signed with a
 * publicly known string. Crashing at boot is the cheapest possible failure.
 */
if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET is not set. Add it to backend/.env (see .env.example).",
  );
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

// `credentials: true` is what allows the browser to store and send the auth
// cookie. It requires an explicit origin — the wildcard "*" is rejected outright
// by browsers when credentials are involved.
app.use(cors({ origin: clientOrigin, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("API Cafecito Feliz con MongoDB");
});

app.use("/api", routes);

// Order matters: 404 for unmatched routes, then the 4-arg error handler last.
app.use(notFound);
app.use(errorHandler);

// Connect before listening, so the server never accepts a request it cannot serve.
try {
  await connectDB();
} catch (error) {
  console.error("FATAL: database unavailable, not starting server.", error.message);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Accepting browser requests from ${clientOrigin}`);
});
