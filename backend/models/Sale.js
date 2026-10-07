import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    /**
     * The customer, when one was identified. Optional: attaching a client is a
     * choice the cashier makes per sale, and most walk-in sales are anonymous.
     * An anonymous sale stores an explicit null rather than omitting the key.
     */
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
      default: null,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        /**
         * Snapshot of the product name at the time of sale.
         *
         * Without this, deleting a product makes populate("products.product")
         * return null on every historical sale, and a past ticket can no longer
         * say what was actually sold. `price` below is a snapshot for the same
         * reason; `name` completes the record so a ticket is reprintable forever.
         */
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        /** Unit price at the time of sale, not the product's current price. */
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    /** Sum of the line totals, before the loyalty discount. */
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    /**
     * The discount RATE as a fraction, not an amount: 0.05 means 5%.
     *
     * Do not write `total = subtotal - discount` — that is off by a factor of
     * 100 and is exactly the mistake this comment exists to prevent. The money
     * taken off is `discount_amount` below.
     */
    discount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    /** The monetary value of the discount, i.e. round2(subtotal * discount). */
    discount_amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    /** What the customer actually paid: subtotal - discount_amount. */
    total_price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

// Admin sales review lists newest-first; index the sort key.
saleSchema.index({ createdAt: -1 });

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
