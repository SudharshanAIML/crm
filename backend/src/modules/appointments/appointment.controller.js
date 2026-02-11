import * as appointmentTokenService from "../../services/appointmentToken.service.js";
import { db } from "../../config/db.js";

/**
 * Appointment Response Controller
 * 
 * Design: Zero UI in backend. All endpoints return pure JSON
 * or 204 No Content. No HTML, no text pages, no redirects.
 */

/**
 * @desc   Accept appointment — returns 204 No Content (zero UI)
 * @route  GET /appointments/accept/:token
 * @access Public (token-based)
 */
export const acceptAppointment = async (req, res) => {
  try {
    const { token } = req.params;

    const verification = appointmentTokenService.verifyToken(token);
    if (!verification.valid) {
      return res.status(204).end();
    }

    const { taskId, contactId, action } = verification;

    // Idempotent — safe to call multiple times
    const alreadyUsed = await appointmentTokenService.isTokenUsed(taskId);
    if (alreadyUsed || action !== "accept") {
      return res.status(204).end();
    }

    await appointmentTokenService.updateAppointmentStatus(taskId, contactId, "ACCEPTED");

    // 204 No Content — no body, no UI, no redirect
    res.status(204).end();
  } catch (error) {
    // Silent failure — no UI, no error page
    res.status(204).end();
  }
};

/**
 * @desc   Get appointment status (for calendar UI)
 * @route  GET /appointments/status/:taskId
 * @access Employee (authenticated)
 */
export const getAppointmentStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const empId = req.user.empId;
    const companyId = req.user.companyId;

    const [rows] = await db.query(
      `SELECT appointment_status, appointment_response_at, appointment_notes
       FROM tasks
       WHERE task_id = ? AND emp_id = ? AND company_id = ?`,
      [taskId, empId, companyId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({
      status: rows[0].appointment_status,
      respondedAt: rows[0].appointment_response_at,
      notes: rows[0].appointment_notes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update appointment status (for employee manual updates)
 * @route  PUT /appointments/status/:taskId
 * @access Employee (authenticated)
 */
export const updateAppointmentStatusByEmployee = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, notes } = req.body;
    const empId = req.user.empId;
    const companyId = req.user.companyId;

    // Validate status
    const validStatuses = ["PENDING", "ACCEPTED", "RESCHEDULE_REQUESTED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Verify task belongs to employee
    const [taskRows] = await db.query(
      `SELECT task_id FROM tasks WHERE task_id = ? AND emp_id = ? AND company_id = ?`,
      [taskId, empId, companyId]
    );

    if (!taskRows[0]) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update status
    await db.query(
      `UPDATE tasks 
       SET appointment_status = ?, 
           appointment_response_at = NOW(), 
           appointment_notes = ?
       WHERE task_id = ?`,
      [status, notes || null, taskId]
    );

    res.json({
      success: true,
      status,
      respondedAt: new Date(),
      notes: notes || null,
    });
  } catch (error) {
    next(error);
  }
};
