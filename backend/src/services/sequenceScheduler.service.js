/**
 * sequenceScheduler.service.js
 *
 * Background service that processes due sequence enrollments.
 *
 * Algorithm (runs every TICK_MS):
 *  1. Fetch up to 100 enrollments where status=ACTIVE AND next_send_at <= NOW()
 *  2. For each enrollment (in parallel, bounded concurrency):
 *     a. Check if the contact has replied since enrollment
 *        → Gmail search: "from:{contact_email} after:{unix_ts_of_enrollment}"
 *     b. If replied: mark REPLIED, bump replied_count, stop processing this enrollment
 *     c. Load the next step (current_step + 1)
 *     d. Interpolate subject/body with contact variables
 *     e. Send via existing sendCustomEmail (tracked, logged in emails table)
 *     f. Write execution log entry
 *     g. If more steps remain: advance current_step, compute next_send_at = NOW() + delay_days
 *        Else: mark COMPLETED, bump completed_count
 *  3. Errors per enrollment are caught individually — one failure never blocks others
 */

import * as repo           from "../modules/sequences/sequence.repo.js";
import * as emailService   from "../modules/emails/email.service.js";
import * as gmailService   from "./gmail.service.js";
import { db }              from "../config/db.js";

const TICK_MS       = 60_000;   // poll every 60 seconds
const MAX_PARALLEL  = 10;       // concurrent enrollments processed per tick

let ticker = null;
let isRunning = false;          // re-entrancy guard

/* =====================================================
   VARIABLE INTERPOLATION
   Mirrors frontend templateInterpolation.js — source of truth is here.
===================================================== */
const interpolate = (text, vars = {}) => {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
};

const buildVars = (contact, employee) => ({
  contact_name:      contact.name        || "",
  contact_email:     contact.email       || "",
  contact_phone:     contact.phone       || "",
  contact_job_title: contact.job_title   || "",
  contact_status:    contact.status      || "",
  company_name:      employee?.company_name || "",
  employee_name:     employee?.name      || "",
  employee_email:    employee?.email     || "",
});

/* =====================================================
   REPLY DETECTION
   Uses Gmail search to check if the contact has emailed
   the employee at any point after the enrollment date.
   Gracefully skips if Gmail is not connected.
===================================================== */
const hasContactReplied = async (empId, contactEmail, enrolledAt) => {
  try {
    // Gmail search query: messages FROM the contact AFTER enrollment date
    const unixTs = Math.floor(new Date(enrolledAt).getTime() / 1000);
    const results = await gmailService.searchMessages(empId, `from:${contactEmail} after:${unixTs}`, {
      maxResults: 1,
    });
    return Array.isArray(results) && results.length > 0;
  } catch {
    // Gmail not connected or search failed — assume no reply, continue sequence
    return false;
  }
};

/* =====================================================
   FETCH EMPLOYEE DATA (for interpolation)
===================================================== */
const getEmployee = async (empId) => {
  const [rows] = await db.query(
    `SELECT e.emp_id, e.name, e.email, c.company_name
     FROM employees e
     JOIN companies c ON c.company_id = e.company_id
     WHERE e.emp_id = ?`,
    [empId]
  );
  return rows[0] || null;
};

/* =====================================================
   PROCESS A SINGLE ENROLLMENT
===================================================== */
const processEnrollment = async (enrollment) => {
  const {
    enrollment_id,
    sequence_id,
    contact_id,
    enrolled_by,
    company_id,
    current_step,
    enrolled_at,
    contact_email,
    contact_name,
  } = enrollment;

  // ── Step A: resolve next step ──
  const nextStepOrder = current_step + 1;
  const [stepRows] = await db.query(
    `SELECT * FROM sequence_steps WHERE sequence_id = ? AND step_order = ?`,
    [sequence_id, nextStepOrder]
  );
  const step = stepRows[0];
  if (!step) {
    // No more steps — mark completed
    await repo.updateEnrollment(enrollment_id, {
      status: "COMPLETED",
      completed_at: new Date(),
      next_send_at: null,
    });
    await repo.incrementCompletedCount(sequence_id);
    return;
  }

  // ── Step B: reply detection ──
  const replied = await hasContactReplied(enrolled_by, contact_email, enrolled_at);
  if (replied) {
    await repo.updateEnrollment(enrollment_id, {
      status: "REPLIED",
      paused_at: new Date(),
      pause_reason: "Contact replied to email",
      next_send_at: null,
    });
    await repo.incrementRepliedCount(sequence_id);
    await repo.logExecution({
      enrollment_id,
      step_id: step.step_id,
      contact_id,
      company_id,
      email_id: null,
      status: "SKIPPED",
      error_message: "Contact replied — sequence paused",
    });
    return;
  }

  // ── Step C: interpolate ──
  const employee = await getEmployee(enrolled_by);
  const contactRows = await db.query(
    `SELECT * FROM contacts WHERE contact_id = ?`, [contact_id]
  );
  const contact = contactRows[0]?.[0] || { name: contact_name, email: contact_email };
  const vars    = buildVars(contact, employee);

  const subject = interpolate(step.subject, vars);
  const body    = interpolate(step.body,    vars);

  // ── Step D: send email ──
  let emailId = null;
  let sendStatus = "SENT";
  let sendError  = null;

  try {
    const result = await emailService.sendCustomEmail({
      contactId: contact_id,
      empId: enrolled_by,
      subject,
      body,
      isHtml: false,
    });
    emailId = result.emailId;
  } catch (err) {
    sendStatus = "FAILED";
    sendError  = err.message;
  }

  // ── Step E: log execution ──
  await repo.logExecution({
    enrollment_id,
    step_id: step.step_id,
    contact_id,
    company_id,
    email_id: emailId,
    status: sendStatus,
    error_message: sendError,
  });

  if (sendStatus === "FAILED") {
    // Don't advance — mark as paused so manual retry is possible
    await repo.updateEnrollment(enrollment_id, {
      status: "PAUSED",
      paused_at: new Date(),
      pause_reason: `Send failed: ${sendError}`,
      next_send_at: null,
    });
    return;
  }

  // ── Step F: advance or complete ──
  const advancedStep = current_step + 1;

  // Is there a step after this one?
  const [nextCheck] = await db.query(
    `SELECT step_id, delay_days FROM sequence_steps WHERE sequence_id = ? AND step_order = ?`,
    [sequence_id, advancedStep + 1]
  );
  const upcomingStep = nextCheck[0];

  if (upcomingStep) {
    const nextSendAt = addDays(new Date(), upcomingStep.delay_days);
    await repo.updateEnrollment(enrollment_id, {
      current_step: advancedStep,
      next_send_at: nextSendAt,
    });
  } else {
    // This was the last step
    await repo.updateEnrollment(enrollment_id, {
      status: "COMPLETED",
      current_step: advancedStep,
      completed_at: new Date(),
      next_send_at: null,
    });
    await repo.incrementCompletedCount(sequence_id);
  }
};

/* =====================================================
   TICK — process all due enrollments
===================================================== */
const tick = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const due = await repo.getDueEnrollments();
    if (!due.length) return;

    console.log(`📬 Sequence scheduler: ${due.length} enrollment(s) due`);

    // Bounded parallel processing to avoid overwhelming the DB / Gmail API
    for (let i = 0; i < due.length; i += MAX_PARALLEL) {
      const batch = due.slice(i, i + MAX_PARALLEL);
      await Promise.allSettled(batch.map(processEnrollment));
    }
  } catch (err) {
    console.error("❌ Sequence scheduler tick error:", err.message);
  } finally {
    isRunning = false;
  }
};

/* =====================================================
   PUBLIC API
===================================================== */
export const startScheduler = () => {
  if (ticker) return; // already running
  ticker = setInterval(tick, TICK_MS);
  // Run one tick immediately on startup to catch anything overdue
  tick().catch((e) => console.error("Sequence scheduler initial tick:", e.message));
  console.log("⏱  Sequence scheduler started (tick every 60s)");
};

export const stopScheduler = () => {
  if (ticker) { clearInterval(ticker); ticker = null; }
  console.log("⏹  Sequence scheduler stopped");
};

/* ─── util ─── */
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d;
};
