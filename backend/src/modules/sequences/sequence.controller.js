import * as svc from "./sequence.service.js";

/* ── sequences ─────────────────────────────────────── */

export const create = async (req, res, next) => {
  try {
    const { name, description, steps } = req.body;
    const seq = await svc.createSequence({
      companyId: req.user.companyId,
      empId: req.user.empId,
      name,
      description,
      steps: steps || [],
    });
    res.status(201).json(seq);
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const sequences = await svc.listSequences(req.user.companyId, { status, search });
    res.json(sequences);
  } catch (e) { next(e); }
};

export const getById = async (req, res, next) => {
  try {
    const seq = await svc.getSequence(+req.params.id, req.user.companyId);
    res.json(seq);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { name, description, status, steps } = req.body;
    const seq = await svc.updateSequence(+req.params.id, req.user.companyId, {
      name, description, status, steps,
    });
    res.json(seq);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await svc.deleteSequence(+req.params.id, req.user.companyId);
    res.json({ success: true });
  } catch (e) { next(e); }
};

/* ── enrollments ───────────────────────────────────── */

export const enroll = async (req, res, next) => {
  try {
    const { contactIds } = req.body;
    if (!Array.isArray(contactIds) || !contactIds.length) {
      return res.status(400).json({ message: "contactIds array is required" });
    }
    const result = await svc.enrollContacts(
      +req.params.id,
      req.user.companyId,
      req.user.empId,
      contactIds,
    );
    res.json(result);
  } catch (e) { next(e); }
};

export const getEnrollments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const enrollments = await svc.listEnrollments(+req.params.id, req.user.companyId, { status });
    res.json(enrollments);
  } catch (e) { next(e); }
};

export const cancelEnrollment = async (req, res, next) => {
  try {
    await svc.cancelEnrollment(+req.params.enrollmentId, req.user.companyId);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const pauseEnrollment = async (req, res, next) => {
  try {
    await svc.pauseEnrollment(+req.params.enrollmentId, req.body.reason);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const resumeEnrollment = async (req, res, next) => {
  try {
    await svc.resumeEnrollment(+req.params.enrollmentId, +req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
};

/* ── contact-level view ────────────────────────────── */
export const getContactEnrollments = async (req, res, next) => {
  try {
    const list = await svc.listContactEnrollments(+req.params.contactId);
    res.json(list);
  } catch (e) { next(e); }
};
