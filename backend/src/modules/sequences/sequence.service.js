import * as repo from "./sequence.repo.js";

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

  const nextSend = addDays(new Date(), steps[0].delay_days);

  // ── Batch validation (3 queries total, regardless of contactIds.length) ──
  const [validRows, alreadyRows] = await Promise.all([
    repo.getContactsByIds(contactIds, companyId),
    repo.getActiveEnrollmentsForContacts(sequenceId, contactIds),
  ]);

  const validIds    = new Set(validRows.map((r) => r.contact_id));
  const enrolledIds = new Set(alreadyRows.map((r) => r.contact_id));

  const toEnroll = contactIds.filter((id) => validIds.has(id) && !enrolledIds.has(id));

  const skipped = [
    ...contactIds.filter((id) => !validIds.has(id))   .map((id) => ({ contactId: id, reason: "Contact not found" })),
    ...contactIds.filter((id) => enrolledIds.has(id)) .map((id) => ({ contactId: id, reason: "Already enrolled" })),
  ];

  if (toEnroll.length > 0) {
    await repo.bulkCreateEnrollments(
      toEnroll.map((contactId) => ({ sequence_id: sequenceId, contact_id: contactId, enrolled_by: empId, company_id: companyId, next_send_at: nextSend }))
    );
    await repo.incrementEnrollmentCountBy(sequenceId, toEnroll.length);
  }

  return { enrolled: toEnroll, skipped };
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
  const [enr, steps] = await Promise.all([
    repo.getEnrollmentById(enrollmentId),
    repo.getStepsBySequence(sequenceId),
  ]);
  if (!enr) throw new Error("Enrollment not found");

  const nextStep = steps.find((s) => s.step_order === enr.current_step + 1);
  if (!nextStep) throw new Error("No more steps to resume — sequence is complete");

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

export const getEnrollmentLog = async (enrollmentId, companyId) => {
  const enr = await repo.getEnrollmentById(enrollmentId);
  if (!enr) throw new Error("Enrollment not found");
  if (enr.company_id !== companyId) throw new Error("Access denied");
  return repo.getExecutionLog(enrollmentId);
};

/* =====================================================
   UTILS
===================================================== */
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d;
};
