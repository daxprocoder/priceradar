import express from "express";
import Alert from "../models/Alert.js";
import { protect } from "../utils/authMiddleware.js";
import { scrapeProductDetails } from "../utils/finalflip.js";

const router = express.Router();

// 1. CREATE ALERT
router.post("/create", protect, async (req, res) => {
  const { productUrl, checkInterval, initialPrice, title, image, store } = req.body;

  try {
    const newAlert = new Alert({
      userId: req.user._id,
      productUrl,
      checkInterval,
      initialPrice,
      lastPrice: initialPrice,
      title,
      image,
      store
    });

    await newAlert.save();
    res.status(201).json({ message: "Alert initialized successfully", alert: newAlert });
  } catch (error) {
    res.status(500).json({ error: "Failed to create alert" });
  }
});

// 2. GET USER ALERTS
router.get("/my-alerts", protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// 3. DELETE ALERT
router.delete("/:id", protect, async (req, res) => {
  try {
    await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: "Alert terminated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

export default router;
