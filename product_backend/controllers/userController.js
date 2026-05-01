import User from "../models/User.js";

export const getVault = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json(user.savedProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vault." });
  }
};

export const addToVault = async (req, res) => {
  const { product } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    
    // Check if already in vault
    const exists = user.savedProducts.find(p => p.productId === product.productId || p.url === product.url);
    if (exists) {
      return res.status(400).json({ error: "Product already in vault." });
    }

    user.savedProducts.push(product);
    await user.save();
    res.status(201).json(user.savedProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to add to vault." });
  }
};

export const removeFromVault = async (req, res) => {
  const { productId } = req.params;
  try {
    const user = await User.findById(req.user.userId);
    user.savedProducts = user.savedProducts.filter(p => p.productId !== productId && p._id.toString() !== productId);
    await user.save();
    res.json(user.savedProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to remove from vault." });
  }
};

export const getHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json(user.searchHistory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history." });
  }
};

export const addHistory = async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required." });
  try {
    const user = await User.findById(req.user.userId);
    user.searchHistory.push({ query, timestamp: new Date() });
    // Keep only last 50 searches
    if (user.searchHistory.length > 50) {
      user.searchHistory = user.searchHistory.slice(-50);
    }
    await user.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save history." });
  }
};
