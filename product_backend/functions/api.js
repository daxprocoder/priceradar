import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import serverless from "serverless-http";
import path from "path";
import fs from "fs";
import scrapeRoutes from "../routes/scrapeRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import adminRoutes from "../routes/adminRoutes.js";

dotenv.config();

const app = express();

// ─── MASTER CORS FIX ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// ─── MONGODB SINGLETON ─────────────────────────────────────────────────────
let cachedDb = null;
const connectToDatabase = async () => {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
};

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("DB Error:", err.message);
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// ─── API ROUTES ────────────────────────────────────────────────────────────
app.use("/api/scrape", scrapeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// ─── SERVE ADMIN UI ────────────────────────────────────────────────────────
app.get("/admin", (req, res) => {
  const filePath = path.resolve(process.cwd(), "admin.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("admin.html not found at: " + filePath);
  }
});

app.get("/", (req, res) => {
  res.json({ status: "✅ PriceRadar API running", admin: "/admin" });
});

export const handler = serverless(app);
