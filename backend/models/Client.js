import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
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
    purchases: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const Client = mongoose.model("Client", clientSchema);

export default Client;
