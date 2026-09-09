import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stock: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
