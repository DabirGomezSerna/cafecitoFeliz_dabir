import jwt from "jsonwebtoken";

/** Name of the cookie carrying the session token. */
export const COOKIE_NAME = "cf_token";

const DEFAULT_EXPIRY = "7d";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Mint a session token.
 *
 * The role is embedded so authorization needs no database round trip. The
 * trade-off is that a role change is not live: a promoted or demoted user keeps
 * their old role until they log in again, up to JWT_EXPIRES_IN. That is noted in
 * the ReadMe because it is a guaranteed support question.
 */
export const signToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      display_name: user.display_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY },
  );

/** Verify and decode a token. Throws on a bad or expired token. */
export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

/**
 * Cookie attributes for the session token.
 *
 * `sameSite: "lax"` is the right choice for this project's dev setup, and it is
 * the detail that most often gets this wrong. The frontend runs on
 * localhost:3000 and the API on localhost:4000. Differing ports make that
 * cross-ORIGIN, so CORS applies and the server must send an explicit origin with
 * credentials:true — but it is still same-SITE, because same-site is computed
 * from the registrable domain and ignores the port. So a lax cookie is sent.
 *
 * Do NOT reach for sameSite:"none" to "fix" a cookie problem: that combination
 * requires secure:true, which browsers refuse over plain http, leaving a cookie
 * that is set but never sent back.
 *
 * `secure` is enabled only in production, where the app is expected to be served
 * over HTTPS.
 *
 * These exact options must also be passed to res.clearCookie on logout; if they
 * differ, the browser treats it as a different cookie and the clear silently
 * does nothing.
 */
export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SEVEN_DAYS_MS,
});
