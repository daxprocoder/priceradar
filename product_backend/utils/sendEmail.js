import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns";

// Fix for Render IPv6 ENETUNREACH Error
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "142.250.114.108", // Hardcoded IPv4 to bypass Render DNS/IPv6 block
  port: 587,
  secure: false,
  requireTLS: true,
  tls: {
    servername: "smtp.gmail.com", // Prevent SSL certificate mismatch
    rejectUnauthorized: false,
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"PRICERADAR COMMAND" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "🔐 SECURE_ACCESS_PROTOCOL: VERIFICATION_CODE",
    html: `
      <div style="background-color: #000000; padding: 40px 20px; font-family: 'Courier New', Courier, monospace; color: #ffffff; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; border: 1px solid #1a1a1a; padding: 40px; background: linear-gradient(180deg, #0a0a0a 0%, #000000 100%); position: relative;">
          
          <!-- Logo Header -->
          <div style="margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #00ff9d; color: #000; padding: 5px 15px; font-weight: 900; font-size: 24px; letter-spacing: -1px; margin-bottom: 5px;">PR</div>
            <div style="font-size: 10px; color: #00ff9d; letter-spacing: 5px; font-weight: bold; margin-top: 10px;">PRICERADAR_SYSTEMS</div>
          </div>

          <div style="height: 1px; background: linear-gradient(90deg, transparent, #00ff9d, transparent); margin: 30px 0;"></div>

          <p style="color: #666; font-size: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">// INITIATING_IDENTITY_VERIFICATION</p>
          
          <h2 style="color: #ffffff; font-size: 20px; font-weight: normal; margin-bottom: 30px;">YOUR_TACTICAL_ACCESS_CODE:</h2>

          <div style="background-color: #111; border: 1px solid #222; padding: 25px; margin: 20px 0;">
            <span style="font-size: 48px; font-weight: bold; color: #00ff9d; letter-spacing: 12px; text-shadow: 0 0 15px rgba(0,255,157,0.3);">${otp}</span>
          </div>

          <p style="color: #444; font-size: 10px; margin-top: 30px; letter-spacing: 1px;">
            CODE_EXPIRES_IN: 10:00_MINUTES <br/>
            SESSION_ID: PR-${Math.random().toString(36).substring(7).toUpperCase()}
          </p>

          <div style="height: 1px; background: linear-gradient(90deg, transparent, #1a1a1a, transparent); margin: 30px 0;"></div>

          <div style="color: #555; font-size: 9px; line-height: 1.6; text-transform: uppercase;">
            <p>This is an automated transmission. <br/> Do not share this code with anyone. <br/> Security status: <span style="color: #00ff9d;">ENCRYPTED_STABLE</span></p>
            <p style="margin-top: 20px;">&copy; 2026 PRICERADAR | GLOBAL_SCAN_NETWORK</p>
          </div>

        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
