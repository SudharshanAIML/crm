import * as repo from "./sequence.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";

/* =====================================================
   VALIDATION HELPERS
===================================================== */
const validateSteps = (steps) => {
  if (!Array.isArray(steps) || steps.length === 0)
    throw new Error("A sequence must have at least one step");
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s.subject?.trim()) throw new Error(`Step ${i + 1}: subject is required`);
    if (!s.body?.trim())    throw new Error(`Step ${i + 1}: body is required`);
    const d = Number(s.delay_days);
    if (isNaN(d) || d < 0) throw new Error(`Step ${i + 1}: delay_days must be ≥ 0`);
  }
};

/* =====================================================
   SEQUENCE CRUD
===================================================== */

export const createSequence = async ({ companyId, empId, name, description, steps = [] }) => {
  if (!name?.trim()) throw new Error("Sequence name is required");
  validateSteps(steps);

  const sequenceId = await repo.createSequence({
    company_id: companyId,
    created_by: empId,
    name: name.trim(),
    description,
  });

  await repo.upsertSteps(sequenceId, steps);
  return getSequence(sequenceId, companyId);
};

export const getSequence = async (sequenceId, companyId) => {
  const seq = await repo.getSequenceById(sequenceId);
  if (!seq) throw new Error("Sequence not found");
  if (seq.company_id !== companyId) throw new Error("Access denied");
  const steps = await repo.getStepsBySequence(sequenceId);
  return { ...seq, steps };
};

export const listSequences = async (companyId, filters = {}) => {
  return repo.listSequences(companyId, filters);
};

export const updateSequence = async (sequenceId, companyId, { name, description, status, steps }) => {
  const seq = await repo.getSequenceById(sequenceId);
  if (!seq) throw new Error("Sequence not found");
  if (seq.company_id !== companyId) throw new Error("Access denied");

  if (steps !== undefined) validateSteps(steps);

  const updates = {};
  if (name        !== undefined) updates.name        = name.trim();
  if (description !== undefined) updates.description = description;
  if (status      !== undefined) updates.status      = status;

  await repo.updateSequence(sequenceId, updates);
  if (steps !== undefined) await repo.upsertSteps(sequenceId, steps);

  return getSequence(sequenceId, companyId);
};

export const deleteSequence = async (sequenceId, companyId) => {
  const seq = await repo.getSequenceById(sequenceId);
  if (!seq) throw new Error("Sequence not found");
  if (seq.company_id !== companyId) throw new Error("Access denied");
  await repo.deleteSequence(sequenceId);
};

/* =====================================================
   ENROLLMENT
===================================================== */

/**
 * Enroll one or more contacts into a sequence.
 * Skips contacts with an already-active/paused enrollment (idempotent).
 * Returns { enrolled, skipped }.
 */
export const enrollContacts = async (sequenceId, companyId, empId, contactIds) => {
  const seq = await repo.getSequenceById(sequenceId);
  if (!seq) throw new Error("Sequence not found");
  if (seq.company_id !== companyId) throw new Error("Access denied");
  if (seq.status !== "ACTIVE") throw new Error("Sequence must be ACTIVE to enroll contacts");

  const steps = await repo.getStepsBySequence(sequenceId);
  if (!steps.length) throw new Error("Sequence has no steps");

  const firstStep = steps[0];
  // next_send_at = NOW() + delay_days of first step
  const nextSend = addDays(new Date(), firstStep.delay_days);

  const results = { enrolled: [], skipped: [] };

  for (const contactId of contactIds) {
    // Verify contact belongs to company
    const contact = await contactRepo.getById(contactId);
    if (!contact || contact.company_id !== companyId) {
      results.skipped.push({ contactId, reason: "Contact not found" });
      continue;
    }

    // Check existing active/paused enrollment
    const existing = await repo.getEnrollment(sequenceId, contactId);
    if (existing && ["ACTIVE", "PAUSED"].includes(existing.status)) {
      results.skipped.push({ contactId, reason: "Already enrolled" });
      continue;
    }

    await repo.createEnrollment({
      sequence_id: sequenceId,
      contact_id: contactId,
      enrolled_by: empId,
      company_id: companyId,
      next_send_at: nextSend,
    });

    await repo.incrementEnrollmentCount(sequenceId);
    results.enrolled.push(contactId);
  }

  return results;
};

export const cancelEnrollment = async (enrollmentId, companyId) => {
  await repo.cancelEnrollment(enrollmentId);
};

export const pauseEnrollment = async (enrollmentId, reason) => {
  await repo.updateEnrollment(enrollmentId, {
    status: "PAUSED",
    paused_at: new Date(),
    pause_reason: reason || null,
  });
};

export const resumeEnrollment = async (enrollmentId, sequenceId) => {
  const steps = await repo.getStepsBySequence(sequenceId);
  const enrollment = await repo.getEnrollment(sequenceId, null); // we look up by enrollmentId
  // Re-fetch directly
  const [rows] = await (await import("../../config/db.js")).db.query(
    `SELECT * FROM sequence_enrollments WHERE enrollment_id = ?`, [enrollmentId]
  );
  const enr = rows[0];
  if (!enr) throw new Error("Enrollment not found");

  const nextStepOrder = enr.current_step + 1;
  const nextStep = steps.find((s) => s.step_order === nextStepOrder);
  if (!nextStep) throw new Error("No more steps to resume");

  await repo.updateEnrollment(enrollmentId, {
    status: "ACTIVE",
    paused_at: null,
    pause_reason: null,
    next_send_at: addDays(new Date(), nextStep.delay_days),
  });
};

export const listEnrollments = async (sequenceId, companyId, filters = {}) => {
  const seq = await repo.getSequenceById(sequenceId);
  if (!seq) throw new Error("Sequence not found");
  if (seq.company_id !== companyId) throw new Error("Access denied");
  return repo.listEnrollments(sequenceId, filters);
};

export const listContactEnrollments = async (contactId) => {
  return repo.listEnrollmentsByContact(contactId);
};

/* =====================================================
   UTILS
===================================================== */
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d;
};
