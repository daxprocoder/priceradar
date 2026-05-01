import User from "../models/User.js";
import { sendOTP } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const requestOTP = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  try {
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email });
    }

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOTP(email, otp);

    res.status(200).json({ message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error in requestOTP:", error);
    res.status(500).json({ error: "Failed to send OTP. Please try again later." });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    // Success
    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set session in cookie if using session middleware, 
    // but here we'll return token and user info
    res.status(200).json({
      message: "Verification successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        onboarded: !!user.name
      }
    });
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    res.status(500).json({ error: "Verification failed." });
  }
};

export const updateProfile = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { name },
      { new: true }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        onboarded: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile." });
  }
};
