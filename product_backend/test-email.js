// Quick local test — run with: node test-email.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("Testing SMTP with:", process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const otp = "847291";

const mailOptions = {
  from: `"PRICERADAR COMMAND" <${process.env.SMTP_USER}>`,
  to: process.env.SMTP_USER, // Send to self for testing
  subject: "🔐 SECURE_ACCESS_PROTOCOL: VERIFICATION_CODE",
  html: `
    <div style="background-color:#000;padding:40px 20px;font-family:'Courier New',monospace;color:#fff;text-align:center;">
      <div style="max-width:500px;margin:0 auto;border:1px solid #1a1a1a;padding:40px;background:linear-gradient(180deg,#0a0a0a 0%,#000 100%);">
        <div style="margin-bottom:30px;">
          <div style="display:inline-block;background:#00ff9d;color:#000;padding:5px 15px;font-weight:900;font-size:24px;letter-spacing:-1px;">PR</div>
          <div style="font-size:10px;color:#00ff9d;letter-spacing:5px;font-weight:bold;margin-top:10px;">PRICERADAR_SYSTEMS</div>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,transparent,#00ff9d,transparent);margin:30px 0;"></div>
        <p style="color:#666;font-size:12px;margin-bottom:20px;letter-spacing:2px;">// INITIATING_IDENTITY_VERIFICATION</p>
        <h2 style="color:#fff;font-size:20px;font-weight:normal;margin-bottom:30px;">YOUR_TACTICAL_ACCESS_CODE:</h2>
        <div style="background:#111;border:1px solid #222;padding:25px;margin:20px 0;">
          <span style="font-size:48px;font-weight:bold;color:#00ff9d;letter-spacing:12px;">${otp}</span>
        </div>
        <p style="color:#444;font-size:10px;margin-top:30px;letter-spacing:1px;">CODE_EXPIRES_IN: 10:00_MINUTES</p>
        <div style="height:1px;background:linear-gradient(90deg,transparent,#1a1a1a,transparent);margin:30px 0;"></div>
        <div style="color:#555;font-size:9px;line-height:1.6;">
          <p>This is an automated transmission.<br/>Do not share this code with anyone.<br/>Security status: <span style="color:#00ff9d;">ENCRYPTED_STABLE</span></p>
          <p style="margin-top:20px;">&copy; 2024 PRICERADAR | GLOBAL_SCAN_NETWORK</p>
        </div>
      </div>
    </div>
  `,
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log("✅ EMAIL SENT SUCCESSFULLY!");
  console.log("Message ID:", info.messageId);
  console.log("Check your inbox at:", process.env.SMTP_USER);
} catch (err) {
  console.error("❌ EMAIL FAILED:", err.message);
  if (err.message.includes("Invalid login")) {
    console.log("\n⚠️  Gmail App Password issue. Make sure:");
    console.log("   1. 2-Step Verification is ON for itspriceradar@gmail.com");
    console.log("   2. App Password was generated at: myaccount.google.com/apppasswords");
    console.log("   3. SMTP_PASS has no spaces in .env");
  }
}
