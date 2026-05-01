import express from "express";
import { adminLogin, getStats } from "../controllers/adminController.js";
import { authenticateToken } from "../utils/authMiddleware.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Admins only." });
  }
};

router.post("/login", adminLogin);
router.get("/stats", authenticateToken, isAdmin, getStats);

export default router;
