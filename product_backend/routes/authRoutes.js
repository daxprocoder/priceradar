import express from "express";
import { requestOTP, verifyOTP, updateProfile } from "../controllers/authController.js";
import { authenticateToken } from "../utils/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", requestOTP);
router.post("/verify-otp", verifyOTP);
router.put("/onboard", authenticateToken, updateProfile);

export default router;
