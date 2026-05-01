import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: "",
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
  searchHistory: [
    {
      query: String,
      timestamp: { type: Date, default: Date.now },
    }
  ],
  savedProducts: [
    {
      productId: String,
      title: String,
      price: String,
      image: String,
      url: String,
      source: String,
    }
  ]
});

const User = mongoose.model("User", userSchema);
export default User;
