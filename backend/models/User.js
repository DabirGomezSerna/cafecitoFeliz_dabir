import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/** Cost factor for bcrypt. 10 is ~100ms on commodity hardware — slow enough to
 *  resist offline cracking, fast enough for an interactive login. */
const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    display_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    /**
     * Bcrypt hash, never a plaintext password.
     *
     * `select: false` keeps it out of every query by default, so a careless
     * res.json(user) cannot leak it. The consequence: any code that needs to
     * verify a password MUST ask for it explicitly with .select("+password"),
     * or comparePassword below compares against undefined and throws.
     */
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    /**
     * "vendor" is a salesperson; "admin" can additionally manage products and
     * review sales. Registration always forces "vendor" — see authController —
     * so the only route to an admin is the seed script or a direct DB update.
     */
    role: {
      type: String,
      enum: ["vendor", "admin"],
      default: "vendor",
    },
  },
  { timestamps: true },
);

/**
 * Hash on the way in.
 *
 * IMPORTANT: this hook runs for .save() and .create() only. It does NOT run for
 * updateOne, findByIdAndUpdate, or insertMany — those would store whatever
 * string they are given, in plaintext. Any future "change password" feature must
 * load the document and .save() it, not update it in place.
 */
// Declared async with no `next` parameter: Mongoose awaits the returned promise
// and treats a throw as the error. (Taking `next` as well is what breaks here —
// Mongoose inspects the function's arity and will not supply it to an async hook.)
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/** Compare a plaintext candidate against the stored hash. Requires that the
 *  document was loaded with .select("+password"). */
userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.password) {
    throw new Error(
      "comparePassword called on a user loaded without the password field — use .select(\"+password\")",
    );
  }
  return bcrypt.compare(plain, this.password);
};

// Belt and braces: strip the hash and the version key from any serialization.
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
