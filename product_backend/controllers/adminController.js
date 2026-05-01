import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (email === "itspriceradar@gmail.com" && password === "Its.price.radar@om") {
    const token = jwt.sign({ role: "admin", email }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Unauthorized access detected." });
};

export const getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    const totalSaved = await User.aggregate([
      { $project: { count: { $size: "$savedProducts" } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);

    // Recent 10 users with all fields
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("email name isVerified createdAt lastLogin");

    // Collect search history from all users (last 30 searches)
    const usersWithHistory = await User.find({ "searchHistory.0": { $exists: true } })
      .select("email searchHistory")
      .limit(20);

    const searchHistory = usersWithHistory.flatMap(u =>
      u.searchHistory.map(h => ({
        query: h.query,
        timestamp: h.timestamp,
        userEmail: u.email
      }))
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);

    res.json({
      stats: {
        totalUsers: userCount,
        verifiedUsers,
        activeAlerts: totalSaved[0]?.total || 0,
        systemStatus: "STABLE",
        nodeVersion: process.version,
      },
      recentUsers,
      searchHistory
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch tactical data: " + error.message });
  }
};
