import crypto from "crypto";
import { db } from "../config/db.js";

/**
 * Appointment Token Service
 * Generates and validates secure one-time tokens for email action links
 * Uses HMAC-SHA256 for cryptographic signing
 */

const SECRET = process.env.APPOINTMENT_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_VALIDITY_HOURS = 168; // 7 days

/**
 * Generate a secure token for appointment action links
 * @param {number} taskId - Task ID
 * @param {number} contactId - Contact ID
 * @param {string} action - Action type ('accept', 'reschedule', 'cancel')
 * @returns {string} Signed token
 */
export const generateToken = (taskId, contactId, action) => {
  const expiresAt = Date.now() + TOKEN_VALIDITY_HOURS * 60 * 60 * 1000;
  const payload = `${taskId}:${contactId}:${action}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}:${signature}`).toString("base64url");
  return token;
};

/**
 * Verify and decode a token
 * @param {string} token - Base64url encoded token
 * @returns {object|null} { taskId, contactId, action } or null if invalid
 */
export const verifyToken = (token) => {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [taskId, contactId, action, expiresAt, signature] = decoded.split(":");

    // Validate expiration
    if (Date.now() > parseInt(expiresAt)) {
      return { valid: false, error: "Token expired" };
    }

    // Verify signature
    const payload = `${taskId}:${contactId}:${action}:${expiresAt}`;
    const expectedSignature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid signature" };
    }

    return {
      valid: true,
      taskId: parseInt(taskId),
      contactId: parseInt(contactId),
      action,
    };
  } catch (err) {
    return { valid: false, error: "Malformed token" };
  }
};

/**
 * Update appointment status in database
 * @param {number} taskId - Task ID
 * @param {number} contactId - Contact ID (for verification)
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 */
export const updateAppointmentStatus = async (taskId, contactId, status, notes = null) => {
  // Verify the task belongs to the contact
  const [rows] = await db.query(
    "SELECT contact_id FROM tasks WHERE task_id = ?",
    [taskId]
  );

  if (!rows[0] || rows[0].contact_id !== contactId) {
    throw new Error("UNAUTHORIZED");
  }

  // Update status
  await db.query(
    `UPDATE tasks 
     SET appointment_status = ?, 
         appointment_response_at = NOW(),
         appointment_notes = ?
     WHERE task_id = ?`,
    [status, notes, taskId]
  );

  return { success: true };
};

/**
 * Check if token has already been used (prevent replay attacks)
 * We check if appointment_response_at is already set for non-PENDING status
 */
export const isTokenUsed = async (taskId) => {
  const [rows] = await db.query(
    "SELECT appointment_status, appointment_response_at FROM tasks WHERE task_id = ?",
    [taskId]
  );

  const task = rows[0];
  if (!task) return true; // Task doesn't exist

  // If status is not PENDING and response timestamp exists, token was used
  return task.appointment_status !== "PENDING" && task.appointment_response_at !== null;
};
