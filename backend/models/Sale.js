import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    discount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total_price: {
      type: Number,
      required: true,
    }
  },
  { timestamps: true },
);

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
