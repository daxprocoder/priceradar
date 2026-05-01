import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import scrapeRoutes from "./routes/scrapeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MASTER CORS FIX ───────────────────────────────────────────────────────// Global CORS - Allow everything for Mobile/Vercel
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

app.options("*", cors()); // Enable preflight for all routes

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'priceradar_default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/scrape", scrapeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/alerts", alertRoutes);

// ─── SERVE ADMIN UI ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/admin", (req, res) => {
  const filePath = path.join(__dirname, "admin.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Fallback for Vercel file structure
    const vercelPath = path.join(process.cwd(), "product_backend", "admin.html");
    if (fs.existsSync(vercelPath)) {
      res.sendFile(vercelPath);
    } else {
      res.status(404).send(`admin.html not found. Checked: ${filePath} and ${vercelPath}`);
    }
  }
});

app.get("/", (req, res) => {
  res.send("PriceRadar Backend API is running on Render...");
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export default app;
