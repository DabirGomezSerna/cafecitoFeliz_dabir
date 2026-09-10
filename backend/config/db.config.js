import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.connection.on("error", (error) =>
  console.log("MongoDB connection error", { error: serializeError(error) }),
);
mongoose.connection.on("disconnected", () => console.log("MongoDB disconnected"));
mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cafecito-pos";
  try {
    const connection = await mongoose.connect(uri);
    console.log("MongoDB connected", { host: connection.connection.host });
  } catch (error) {
    // The original code discarded this object entirely — the cause was lost.
    console.log("MongoDB connection failed", { error: serializeError(error) });
    process.exit(1);
  }
};

export default connectDB;