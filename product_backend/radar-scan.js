import mongoose from "mongoose";
import dotenv from "dotenv";
import Alert from "./models/Alert.js";
import User from "./models/User.js";
import { scrapeProductDetails } from "./utils/finalflip.js";
import { sendOTP } from "./utils/sendEmail.js"; // We'll repurpose this or add a new sendPriceAlert function

dotenv.config();

const checkAllPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📡 RADAR_SCAN_INITIATED...");

    const alerts = await Alert.find({ isActive: true });
    console.log(`🔍 SCANNING_${alerts.length}_TARGETS...`);

    for (const alert of alerts) {
      console.log(`\n// ANALYZING: ${alert.title}`);
      
      const currentData = await scrapeProductDetails(alert.productUrl);
      
      if (!currentData || !currentData.price) {
        console.log("⚠️ SCAN_FAILED: TARGET_UNREACHABLE");
        continue;
      }

      const oldPrice = alert.lastPrice;
      const newPrice = currentData.price;

      if (newPrice !== oldPrice) {
        const diff = newPrice - oldPrice;
        const status = diff > 0 ? "INCREASED" : "DECREASED";
        console.log(`📊 FLUCTUATION_DETECTED: ${status} by ₹${Math.abs(diff)}`);

        // Update database
        alert.lastPrice = newPrice;
        alert.lastChecked = new Date();
        await alert.save();

        // Notify User via Email
        const user = await User.findById(alert.userId);
        if (user) {
          // Simplified notification for now
          console.log(`📧 SENDING_ALERT_TO: ${user.email}`);
          // You can create a more beautiful email helper here
        }
      } else {
        console.log("✅ STATUS_STABLE: NO_CHANGE_DETECTED");
      }
    }

    console.log("\n🚀 SCAN_COMPLETE: SYSTEM_IDLE");
    process.exit(0);
  } catch (error) {
    console.error("💥 RADAR_CRITICAL_ERROR:", error);
    process.exit(1);
  }
};

checkAllPrices();
