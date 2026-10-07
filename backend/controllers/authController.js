import User from "../models/User.js";
import HttpError from "../utils/HttpError.js";
import { COOKIE_NAME, signToken, cookieOptions } from "../utils/jwt.js";

/** The only user fields ever sent to a client. Never includes the password. */
const publicUser = (user) => ({
  _id: String(user._id),
  display_name: user.display_name,
  email: user.email,
  role: user.role,
});

/**
 * POST /api/auth/register — public.
 *
 * Creates a staff account. The role is HARD-CODED to "vendor" and is
 * deliberately NOT read from the request body: a caller who posts
 * {"role":"admin"} gets a vendor like everyone else. Promoting someone to admin
 * is a deliberate out-of-band action (the seed script, or a direct DB update).
 *
 * Do not "tidy" this into User.create({ ...req.body }). That one-line change
 * would let anyone mint themselves an administrator.
 */
const register = async (req, res, next) => {
  try {
    const { display_name, email, password } = req.body;

    if (!display_name || !email || !password) {
      throw new HttpError(400, "Name, email and password are all required", {
        code: "MISSING_FIELDS",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // A pre-check gives a clean message. The unique index is the real guard, and
    // errorHandler maps a duplicate-key race to 409 as a backstop.
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new HttpError(409, "User already exist", { code: "EMAIL_TAKEN" });
    }

    const user = await User.create({
      display_name,
      email: normalizedEmail,
      password,
      role: "vendor",
    });

    // No cookie is set here: registration does not log you in. The frontend's
    // RegisterForm already redirects to /login with a "account created" banner.
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/login — public. Sets the session cookie. */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new HttpError(400, "Invalid Credentials", {
        code: "INVALID_CREDENTIALS",
      });
    }

    // `password` is select:false on the schema, so it must be requested.
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+password");

    // One generic message for both "no such account" and "wrong password", so
    // the endpoint cannot be used to enumerate which emails are registered.
    if (!user || !(await user.comparePassword(password))) {
      throw new HttpError(401, "Invalid Credentials", {
        code: "INVALID_CREDENTIALS",
      });
    }

    res.cookie(COOKIE_NAME, signToken(user), cookieOptions());

    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout — public and idempotent.
 *
 * clearCookie must receive the same attributes used to set the cookie, or the
 * browser treats it as a different cookie and the clear silently no-ops.
 */
const logout = async (req, res, next) => {
  try {
    const { maxAge, ...clearOptions } = cookieOptions();
    res.clearCookie(COOKIE_NAME, clearOptions);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me — requires a session.
 *
 * The frontend cannot read the httpOnly cookie, so "am I logged in?" has to be a
 * network probe. This reads the database on purpose rather than echoing the token
 * payload, so the response carries the user's CURRENT role and 401s if the
 * account was deleted after the token was issued.
 */
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new HttpError(401, "Session no longer valid", {
        code: "USER_NOT_FOUND",
      });
    }

    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export { register, login, logout, me };
