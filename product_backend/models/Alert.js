import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: String,
  productUrl: {
    type: String,
    required: true,
  },
  initialPrice: Number,
  lastPrice: Number,
  image: String,
  checkInterval: {
    type: String, // "1h", "6h", "24h"
    default: "24h",
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
  store: String,
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

const Alert = mongoose.model("Alert", alertSchema);
export default Alert;
