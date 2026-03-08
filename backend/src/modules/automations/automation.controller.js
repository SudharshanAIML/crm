import * as automationService from "./automation.service.js";

/* =====================================================
   GET BUILDER METADATA  (triggers, actions, operators)
   GET /api/automations/metadata
===================================================== */
export const getMetadata = async (_req, res, next) => {
  try {
    res.json(automationService.getBuilderMetadata());
  } catch (err) { next(err); }
};

/* =====================================================
   LIST AUTOMATIONS
   GET /api/automations
===================================================== */
export const list = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { limit = 50, offset = 0, activeOnly } = req.query;
    const automations = await automationService.listAutomations(companyId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      activeOnly: activeOnly === "true",
    });
    res.json({ success: true, automations });
  } catch (err) { next(err); }
};

/* =====================================================
   GET SINGLE AUTOMATION
   GET /api/automations/:id
===================================================== */
export const getById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const automation = await automationService.getAutomation(parseInt(req.params.id), companyId);
    if (!automation) return res.status(404).json({ success: false, message: "Automation not found" });
    res.json({ success: true, automation });
  } catch (err) { next(err); }
};

/* =====================================================
   CREATE AUTOMATION
   POST /api/automations
===================================================== */
export const create = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const id = await automationService.createAutomation(companyId, empId, req.body);
    const automation = await automationService.getAutomation(id, companyId);
    res.status(201).json({ success: true, automation });
  } catch (err) { next(err); }
};

/* =====================================================
   UPDATE AUTOMATION
   PATCH /api/automations/:id
===================================================== */
export const update = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const automation = await automationService.updateAutomation(parseInt(req.params.id), companyId, req.body);
    res.json({ success: true, automation });
  } catch (err) { next(err); }
};

/* =====================================================
   DELETE AUTOMATION
   DELETE /api/automations/:id
===================================================== */
export const remove = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    await automationService.deleteAutomation(parseInt(req.params.id), companyId);
    res.json({ success: true, message: "Automation deleted" });
  } catch (err) { next(err); }
};

/* =====================================================
   TOGGLE ENABLE / DISABLE
   PATCH /api/automations/:id/toggle
===================================================== */
export const toggle = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { active } = req.body;
    const automation = await automationService.toggleAutomation(parseInt(req.params.id), companyId, !!active);
    res.json({ success: true, automation });
  } catch (err) { next(err); }
};

/* =====================================================
   EXECUTION LOGS — per automation
   GET /api/automations/:id/logs
===================================================== */
export const getLogs = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { limit = 30, offset = 0 } = req.query;
    const logs = await automationService.getExecutionLogs(parseInt(req.params.id), companyId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ success: true, logs });
  } catch (err) { next(err); }
};

/* =====================================================
   EXECUTION LOGS — company-wide
   GET /api/automations/logs
===================================================== */
export const getCompanyLogs = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { limit = 50, offset = 0, status } = req.query;
    const logs = await automationService.getCompanyLogs(companyId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status: status || undefined,
    });
    res.json({ success: true, logs });
  } catch (err) { next(err); }
};

/* =====================================================
   ANALYTICS
   GET /api/automations/analytics
===================================================== */
export const getAnalytics = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const analytics = await automationService.getAnalytics(companyId);
    res.json({ success: true, analytics });
  } catch (err) { next(err); }
};
