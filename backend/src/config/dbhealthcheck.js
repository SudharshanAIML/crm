import express from "express";
import { db } from "../config/db.js";

const router = express.Router();

// Cache health status to avoid excessive DB queries
let lastHealthCheck = null;
let lastCheckTime = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache for successful checks
const ERROR_CACHE_DURATION = 5 * 1000; // 5 seconds cache for errors (allow quick retry)

// Wake-up configuration
const WAKE_UP_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Attempts to wake up the database with exponential backoff retry logic.
 * Cloud databases (like Aiven) may enter sleep mode after inactivity.
 * 
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<{success: boolean, attempts: number, responseTime: number, error?: string}>}
 */
async function wakeUpDatabase(maxRetries = WAKE_UP_CONFIG.maxRetries) {
  const startTime = Date.now();
  let lastError = null;
  let delay = WAKE_UP_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use a simple query that forces connection validation
      const connection = await db.getConnection();
      
      try {
        // Ping to validate connection is truly alive
        await connection.ping();
        // Run a lightweight query to ensure DB is responsive
        await connection.query("SELECT 1");
        
        return {
          success: true,
          attempts: attempt,
          responseTime: Date.now() - startTime,
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      lastError = error;
      console.warn(
        `⏳ Database wake-up attempt ${attempt}/${maxRetries} failed: ${error.code || error.message}`
      );

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        await sleep(delay);
        // Exponential backoff with cap
        delay = Math.min(delay * WAKE_UP_CONFIG.backoffMultiplier, WAKE_UP_CONFIG.maxDelayMs);
      }
    }
  }

  return {
    success: false,
    attempts: maxRetries,
    responseTime: Date.now() - startTime,
    error: lastError?.message || "Unknown error",
  };
}

/**
 * Simple sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @route   GET /api/health
 * @desc    Health check endpoint - wakes up DB if sleeping & keeps it alive
 * @access  Public
 * 
 * Optimizations:
 * - Caches successful results for 2 minutes to prevent DB flooding
 * - Caches errors for 5 seconds to allow quick recovery checks
 * - Uses exponential backoff retry for sleeping databases
 * - Validates connection with ping + query
 * - Returns detailed metrics
 */
router.get("/health", async (req, res) => {
  const now = Date.now();
  const forceRefresh = req.query.force === "true";
  
  // Return cached result if within cache window (unless force refresh)
  if (!forceRefresh && lastHealthCheck) {
    const cacheDuration = lastHealthCheck.status === "ok" 
      ? CACHE_DURATION 
      : ERROR_CACHE_DURATION;
    
    if ((now - lastCheckTime) < cacheDuration) {
      return res.json({
        ...lastHealthCheck,
        cached: true,
        cacheAge: `${Math.round((now - lastCheckTime) / 1000)}s`,
      });
    }
  }

  // Attempt to wake up / verify database connection
  const result = await wakeUpDatabase();
  
  if (result.success) {
    lastHealthCheck = {
      status: "ok",
      database: "connected",
      responseTime: `${result.responseTime}ms`,
      attempts: result.attempts,
      timestamp: new Date().toISOString(),
    };
    lastCheckTime = now;

    // Log if it took multiple attempts (DB was likely sleeping)
    if (result.attempts > 1) {
      console.log(`✅ Database woke up after ${result.attempts} attempts (${result.responseTime}ms)`);
    }

    res.json({ ...lastHealthCheck, cached: false });
  } else {
    console.error(`❌ Health check failed after ${result.attempts} attempts: ${result.error}`);
    
    lastHealthCheck = {
      status: "error",
      database: "disconnected",
      error: result.error,
      attempts: result.attempts,
      responseTime: `${result.responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
    lastCheckTime = now;

    res.status(503).json({ ...lastHealthCheck, cached: false });
  }
});

/**
 * @route   GET /api/wake
 * @desc    Explicit database wake-up endpoint with extended retries
 * @access  Public
 * 
 * Use this endpoint when you know the database might be sleeping
 * and need to ensure it's fully awake before making other requests.
 */
router.get("/wake", async (req, res) => {
  console.log("🔔 Explicit database wake-up requested");
  
  // Use more retries for explicit wake-up requests
  const result = await wakeUpDatabase(5);
  
  // Clear health check cache to force fresh check next time
  lastHealthCheck = null;
  lastCheckTime = 0;
  
  if (result.success) {
    console.log(`✅ Database successfully woken up (${result.attempts} attempts, ${result.responseTime}ms)`);
    res.json({
      status: "ok",
      message: "Database is awake and responsive",
      attempts: result.attempts,
      responseTime: `${result.responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } else {
    console.error(`❌ Failed to wake database: ${result.error}`);
    res.status(503).json({
      status: "error",
      message: "Failed to wake database",
      error: result.error,
      attempts: result.attempts,
      responseTime: `${result.responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/ping
 * @desc    Ultra-lightweight ping (no DB) - just confirms server is alive
 * @access  Public
 */
router.get("/ping", (req, res) => {
  res.json({ pong: true, timestamp: Date.now() });
});

export default router;
