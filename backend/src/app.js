import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import database health check
import healthRouter from "./config/dbhealthcheck.js";

// Import error handler middleware
import { errorHandler } from "./middlewares/error.middleware.js";

// Import route modules
import authRoutes from "./modules/auth/auth.routes.js";
import companyRoutes from "./modules/companies/company.routes.js";
import employeeRoutes from "./modules/employees/employee.routes.js";
import contactRoutes from "./modules/contacts/contact.routes.js";
import sessionRoutes from "./modules/sessions/session.routes.js";
import opportunityRoutes from "./modules/opportunities/opportunity.routes.js";
import dealRoutes from "./modules/deals/deal.route.js";
import feedbackRoutes from "./modules/feedback/feedback.routes.js";
import emailRoutes from "./modules/emails/email.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import taskRoutes from "./modules/tasks/task.routes.js";
import outreachRoutes from "./modules/outreach/outreach.routes.js";
import outreachPublicRoutes from "./modules/outreach/pages.public.routes.js";
import appointmentRoutes from "./modules/appointments/appointment.routes.js";
import callRoutes from "./modules/calls/call.routes.js";

// Initialize Express app
const app = express();

/* =====================================================
   TRUST PROXY CONFIGURATION
===================================================== */

/**
 * Enable trust proxy to get real client IP from proxy headers
 * This is critical for production deployments behind:
 * - Load balancers (AWS ALB, GCP LB, Azure LB)
 * - Reverse proxies (Nginx, Apache)
 * - CDNs (Cloudflare, Fastly, Akamai)
 *
 * Setting to 'true' trusts all proxies (suitable for most cloud deployments)
 * For stricter security, specify proxy IP/CIDR ranges
 */
app.set('trust proxy', process.env.TRUST_PROXY || true);

/* =====================================================
   SECURITY MIDDLEWARE
===================================================== */

// Helmet - Security headers
app.use(helmet());

// CORS - Cross-Origin Resource Sharing
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting - Prevent DDoS/brute-force attacks
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // limit each IP to 1000 requests per windowMs (increased for dev)
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "development", // Skip rate limiting in development
});
app.use("/api", limiter);

/* =====================================================
   BODY PARSING MIDDLEWARE
===================================================== */

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =====================================================
   COMPRESSION MIDDLEWARE
===================================================== */

// Compress responses
app.use(compression());

/* =====================================================
   REQUEST LOGGING (Development)
===================================================== */

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.originalUrl}`);
    next();
  });
}

/* =====================================================
   HEALTH CHECK ROUTES
===================================================== */

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CRM API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/render", (_, res) => {
  res.sendStatus(200);
});

// Database health check
app.use("/api", healthRouter);

/* =====================================================
   API ROUTES
===================================================== */

// Authentication routes
app.use("/api/auth", authRoutes);

// Company management routes
app.use("/api/companies", companyRoutes);

// Employee management routes
app.use("/api/employees", employeeRoutes);

// Contact/Lead management routes (core CRM pipeline)
app.use("/api/contacts", contactRoutes);

// Session management routes (MQL/SQL calls)
app.use("/api/sessions", sessionRoutes);

// Opportunity management routes
app.use("/api/opportunities", opportunityRoutes);

// Deal management routes
app.use("/api/deals", dealRoutes);

// Feedback management routes
app.use("/api/feedback", feedbackRoutes);

// Email tracking routes
app.use("/api/emails", emailRoutes);

// Email tracking pixel/link (public route for tracking)
app.use("/api", emailRoutes);

// Analytics/Dashboard routes
app.use("/api/analytics", analyticsRoutes);

// Task/Calendar management routes
app.use("/api/tasks", taskRoutes);

// Appointment response routes (public + authenticated)
app.use("/api/appointments", appointmentRoutes);

// AI Outreach routes (RAG + Autopilot)
app.use("/api/outreach", outreachRoutes);

// Public outreach pages (no auth required)
app.use("/api/public", outreachPublicRoutes);

// Call/Twilio routes
app.use("/api/calls", callRoutes);

/* =====================================================
   404 HANDLER
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(errorHandler);

/* =====================================================
   IMPORT EMAIL QUEUE FOR GRACEFUL SHUTDOWN
===================================================== */

import * as emailQueue from "./services/emailQueue.service.js";
import { restoreAutopilotSessions } from "./modules/outreach/autopilot.service.js";
import { initSocketIO } from "./services/socket.service.js";

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  // Wait for email queue to finish
  await emailQueue.shutdown();

  // Close server
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  // Force close after 30s (increased for email queue)
  setTimeout(() => {
    console.error("⚠️ Forcing shutdown after timeout");
    process.exit(1);
  }, 30000);
};

/* =====================================================
   START SERVER
===================================================== */

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

import { createServer } from "http";
const httpServer = createServer(app);

// Attach Socket.IO to the HTTP server (real-time chat)
initSocketIO(httpServer);

const server = httpServer.listen(PORT, HOST, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 CRM Backend Server Started Successfully!             ║
║                                                           ║
║   📍 URL: http://${HOST}:${PORT}
║   🌍 Environment: ${process.env.NODE_ENV || "development"}
║   📅 Started at: ${new Date().toISOString()}
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📚 API Endpoints:
   • GET  /                          - Server status
   • GET  /api/health                - Database health check
   • POST /api/auth/google           - Google OAuth login

   • GET  /api/companies             - List companies
   • POST /api/companies             - Create company

   • GET  /api/employees             - List employees
   • POST /api/employees             - Create employee
   • GET  /api/employees/me          - Get current user

   • GET  /api/contacts              - List contacts
   • POST /api/contacts              - Create lead
   • PATCH /api/contacts/:id/promote-sql    - MQL → SQL
   • POST /api/contacts/:id/opportunity     - SQL → Opportunity
   • POST /api/contacts/:id/evangelist      - Customer → Evangelist

   • POST /api/sessions              - Create session (MQL/SQL calls)
   • GET  /api/sessions/contact/:id  - Get sessions for contact

   • POST /api/opportunities         - Create opportunity
   • POST /api/opportunities/:id/won - Mark as WON → Customer
   • POST /api/opportunities/:id/lost - Mark as LOST → Dormant

   • POST /api/deals                 - Create deal
   • GET  /api/deals/:id             - Get deal

   • POST /api/feedback              - Submit feedback
   • GET  /api/feedback/contact/:id  - Get feedback

   • GET  /api/analytics/dashboard   - Dashboard stats
   • GET  /api/analytics/funnel      - Pipeline funnel
   • GET  /api/analytics/performance - Employee performance

   • POST /api/outreach/documents    - Upload RAG document
   • POST /api/outreach/generate     - Generate AI emails
   • POST /api/outreach/send         - Send generated emails
   • POST /api/outreach/autopilot/start  - Start auto-reply mode
   • POST /api/outreach/autopilot/stop   - Stop auto-reply mode
  `);

  // Restore any active autopilot sessions
  try {
    await restoreAutopilotSessions();
  } catch (err) {
    console.error("⚠️ Failed to restore autopilot sessions:", err.message);
  }
});

// Handle shutdown signalsanagement.f.aivencloud.com:12247/defaultdb?ssl-mode=REQUIRED
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

export default app;
