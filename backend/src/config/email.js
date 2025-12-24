import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 * Supports Gmail SMTP with App Password
 */
export const initializeEmailTransport = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
  const emailPort = parseInt(process.env.EMAIL_PORT || "587");

  if (!emailUser || !emailPass) {
    console.warn("⚠️  Email credentials not configured. Emails will be logged only.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ Email transport error:", error.message);
    } else {
      console.log("✅ Email transport ready");
    }
  });

  return transporter;
};

/**
 * Send email using configured transporter
 */
export const sendMail = async ({ to, subject, html, text, attachments = [] }) => {
  if (!transporter) {
    console.log(`📧 [MOCK] Email to: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${text || html?.substring(0, 100)}...`);
    return { messageId: `mock-${Date.now()}`, mock: true };
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "CRM System"}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} (ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Get transporter instance
 */
export const getTransporter = () => transporter;

// Initialize on module load
initializeEmailTransport();