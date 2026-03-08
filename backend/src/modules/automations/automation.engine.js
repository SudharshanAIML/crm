/**
 * Automation Execution Engine
 *
 * Subscribes to CRM events via the EventBus, finds matching active
 * automations for that company + trigger type, evaluates conditions,
 * and executes action nodes in order.
 *
 * Workflow JSON schema  (array of nodes):
 *  {
 *    id:        string,
 *    type:      "condition" | "action",
 *    config:    { ... },            // type-specific
 *    next:      string | null,      // next node id
 *    nextElse:  string | null,      // for condition nodes — branch on false
 *  }
 *
 * Condition config examples:
 *   { field: "temperature",  operator: "eq",  value: "HOT" }
 *   { field: "interest_score", operator: "gte", value: 7 }
 *   { field: "assigned_emp_id", operator: "eq", value: 3 }
 *   { field: "deal_value", operator: "gte", value: 5000 }
 *   { field: "status", operator: "eq", value: "CUSTOMER" }
 *
 * Action config examples:
 *   { action: "send_email",       subject, body, to? }
 *   { action: "send_notification", title, message, empId? }
 *   { action: "assign_user",      empId }
 *   { action: "create_task",      title, description, dueInHours }
 *   { action: "update_field",     field, value }
 *   { action: "change_stage",     stage }
 *   { action: "add_tag",          tag }
 *   { action: "trigger_webhook",  url, method, headers?, body? }
 */

import * as automationRepo from "./automation.repo.js";
import eventBus, { CRM_EVENTS } from "../../services/eventBus.service.js";

// Lazy imports to avoid circular deps — resolved on first use
let contactRepo, taskService, notificationService, emailService, emailQueue;

const lazyLoad = async () => {
  if (!contactRepo) {
    contactRepo = await import("../contacts/contact.repo.js");
    taskService = await import("../tasks/task.service.js").catch(() => null);
    notificationService = await import("../notifications/notification.service.js");
    emailService = await import("../emails/email.service.js");
    emailQueue = await import("../../services/emailQueue.service.js");
  }
};

/* =====================================================
   TRIGGER → EVENT MAPPING
===================================================== */
const TRIGGER_TO_EVENT = {
  "contact.created":        CRM_EVENTS.CONTACT_CREATED,
  "contact.updated":        CRM_EVENTS.CONTACT_UPDATED,
  "contact.status_changed": CRM_EVENTS.CONTACT_STATUS_CHANGED,
  "deal.stage_changed":     CRM_EVENTS.DEAL_STAGE_CHANGED,
  "session.created":        CRM_EVENTS.SESSION_CREATED,
  "email.opened":           CRM_EVENTS.EMAIL_OPENED,
  "email.clicked":          CRM_EVENTS.EMAIL_CLICKED,
  "feedback.submitted":     CRM_EVENTS.FEEDBACK_SUBMITTED,
  "task.created":           CRM_EVENTS.TASK_CREATED,
  "deal.won":               CRM_EVENTS.DEAL_WON,
  "deal.lost":              CRM_EVENTS.DEAL_LOST,
};

/* =====================================================
   CONDITION EVALUATOR
===================================================== */
const OPERATORS = {
  eq:       (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
  neq:      (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
  gt:       (a, b) => Number(a) > Number(b),
  gte:      (a, b) => Number(a) >= Number(b),
  lt:       (a, b) => Number(a) < Number(b),
  lte:      (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  not_contains: (a, b) => !String(a).toLowerCase().includes(String(b).toLowerCase()),
  is_empty: (a) => a === null || a === undefined || String(a).trim() === "",
  is_not_empty: (a) => a !== null && a !== undefined && String(a).trim() !== "",
};

const evaluateCondition = (config, context) => {
  const { field, operator, value } = config;

  // Resolve field value from context.data (the entity) or context directly
  let actual = context.data?.[field] ?? context[field] ?? null;

  const fn = OPERATORS[operator];
  if (!fn) {
    console.warn(`[AutomationEngine] Unknown operator "${operator}"`);
    return false;
  }
  return fn(actual, value);
};

/* =====================================================
   ACTION EXECUTORS
===================================================== */

const executeAction = async (config, context) => {
  await lazyLoad();
  const { action } = config;

  switch (action) {
    /* ---------- Send Email ---------- */
    case "send_email": {
      const to = config.to || context.data?.email;
      if (!to) throw new Error("No recipient email");
      emailQueue.queueEmail({
        emailId: null,
        empId: context.empId || null,
        to,
        subject: interpolate(config.subject || "Automated Email", context),
        htmlBody: interpolate(config.body || "", context),
        priority: "normal",
        sendMethod: context.empId ? "gmail" : "smtp",
      });
      return { sent_to: to };
    }

    /* ---------- Send Internal Notification ---------- */
    case "send_notification": {
      const empId = config.empId || context.empId || context.data?.assigned_emp_id;
      if (!empId) throw new Error("No target employee for notification");
      await notificationService.createNotification({
        company_id: context.companyId,
        emp_id: empId,
        type: "SYSTEM",
        title: interpolate(config.title || "Automation Notification", context),
        message: interpolate(config.message || "", context),
        entity_type: context.data?.contact_id ? "CONTACT" : "SYSTEM",
        entity_id: context.entityId || null,
        priority: config.priority || 5,
      });
      return { notified_emp: empId };
    }

    /* ---------- Assign User ---------- */
    case "assign_user": {
      const contactId = context.entityId || context.data?.contact_id;
      if (!contactId) throw new Error("No contact to assign");
      await contactRepo.assignEmployee(contactId, config.empId);
      return { assigned: config.empId };
    }

    /* ---------- Create Follow-up Task ---------- */
    case "create_task": {
      const contactId = context.entityId || context.data?.contact_id;
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + (config.dueInHours || 24));
      const empId = config.empId || context.empId || context.data?.assigned_emp_id;

      // Direct DB insert to avoid circular dependency issues
      const { db: database } = await import("../../config/db.js");
      const [result] = await database.query(
        `INSERT INTO tasks (company_id, emp_id, contact_id, title, description, task_type, due_date, status)
         VALUES (?, ?, ?, ?, ?, 'FOLLOW_UP', ?, 'PENDING')`,
        [
          context.companyId,
          empId || null,
          contactId || null,
          interpolate(config.title || "Automated Follow-up", context),
          interpolate(config.description || "", context),
          dueDate,
        ]
      );
      return { task_id: result.insertId };
    }

    /* ---------- Update Contact Field ---------- */
    case "update_field": {
      const contactId = context.entityId || context.data?.contact_id;
      if (!contactId) throw new Error("No contact to update");
      await contactRepo.updateContact(contactId, { [config.field]: config.value });
      return { updated: config.field };
    }

    /* ---------- Change Pipeline Stage ---------- */
    case "change_stage": {
      const contactId = context.entityId || context.data?.contact_id;
      if (!contactId) throw new Error("No contact for stage change");
      const currentStatus = context.data?.status;
      await contactRepo.updateStatus(contactId, config.stage);
      await contactRepo.insertStatusHistory(contactId, currentStatus || "UNKNOWN", config.stage, null);
      return { new_stage: config.stage };
    }

    /* ---------- Add Tag / Label ---------- */
    case "add_tag": {
      // Tags stored as JSON array on contacts — append if not present
      const contactId = context.entityId || context.data?.contact_id;
      if (!contactId) throw new Error("No contact for tagging");
      const { db: database } = await import("../../config/db.js");
      // Read current tags
      const [[row]] = await database.query(
        `SELECT tags FROM contacts WHERE contact_id = ?`, [contactId]
      );
      let tags = [];
      try { tags = JSON.parse(row?.tags || "[]"); } catch { tags = []; }
      const tag = config.tag || config.label;
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
        await database.query(
          `UPDATE contacts SET tags = ? WHERE contact_id = ?`,
          [JSON.stringify(tags), contactId]
        );
      }
      return { tag_added: tag };
    }

    /* ---------- Trigger Webhook ---------- */
    case "trigger_webhook": {
      const url = config.url;
      if (!url) throw new Error("No webhook URL");
      const method = (config.method || "POST").toUpperCase();
      const headers = { "Content-Type": "application/json", ...(config.headers || {}) };
      const body = JSON.stringify({
        event: context.triggerType,
        entity_id: context.entityId,
        data: context.data,
        timestamp: new Date().toISOString(),
        ...(config.body || {}),
      });

      const resp = await fetch(url, { method, headers, body: method !== "GET" ? body : undefined, signal: AbortSignal.timeout(10000) });
      return { webhook_status: resp.status };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

/* =====================================================
   TEMPLATE INTERPOLATION
   Replaces {{field}} with values from context
===================================================== */
const interpolate = (template, context) => {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return context.data?.[key] ?? context[key] ?? "";
  });
};

/* =====================================================
   WORKFLOW RUNNER
   Walks the node graph, evaluates conditions, runs actions
===================================================== */

const runWorkflow = async (automation, context) => {
  const nodes = automation.workflow;
  if (!Array.isArray(nodes) || nodes.length === 0) return { steps: [], ok: true };

  // Build lookup map
  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id, n);

  const steps = [];
  let currentId = nodes[0].id; // start at first node
  let iterationGuard = 0;
  const MAX_ITERATIONS = 100; // prevent infinite loops

  while (currentId && iterationGuard < MAX_ITERATIONS) {
    iterationGuard++;
    const node = nodeMap.get(currentId);
    if (!node) break;

    const stepStart = Date.now();

    if (node.type === "condition") {
      try {
        const passed = evaluateCondition(node.config, context);
        steps.push({ nodeId: node.id, type: "condition", passed, ms: Date.now() - stepStart });
        currentId = passed ? (node.next || null) : (node.nextElse || null);
      } catch (err) {
        steps.push({ nodeId: node.id, type: "condition", passed: false, error: err.message, ms: Date.now() - stepStart });
        currentId = node.nextElse || null;
      }
    } else if (node.type === "action") {
      try {
        const result = await executeAction(node.config, context);
        steps.push({ nodeId: node.id, type: "action", action: node.config.action, ok: true, result, ms: Date.now() - stepStart });
        currentId = node.next || null;
      } catch (err) {
        steps.push({ nodeId: node.id, type: "action", action: node.config.action, ok: false, error: err.message, ms: Date.now() - stepStart });
        // Continue to next node even on failure (best-effort)
        currentId = node.next || null;
      }
    } else {
      // Unknown node type — skip
      currentId = node.next || null;
    }
  }

  const hasFailure = steps.some((s) => s.type === "action" && s.ok === false);
  const allFailed = steps.filter((s) => s.type === "action").every((s) => s.ok === false);

  return {
    steps,
    ok: !hasFailure,
    status: allFailed && steps.some((s) => s.type === "action") ? "FAILURE" : hasFailure ? "PARTIAL" : "SUCCESS",
  };
};

/* =====================================================
   EVENT HANDLER — called by EventBus
===================================================== */

const handleEvent = async (triggerType, payload) => {
  try {
    const { companyId, entityId, data, empId } = payload;
    console.log(`[AutomationEngine] Event "${triggerType}" received for company ${companyId}, entity ${entityId || 'N/A'}`);
    const automations = await automationRepo.findActiveByTrigger(companyId, triggerType);
    if (automations.length === 0) {
      console.log(`[AutomationEngine] No active automations for "${triggerType}" in company ${companyId}`);
      return;
    }
    console.log(`[AutomationEngine] Found ${automations.length} automation(s) to run`);

    for (const automation of automations) {
      const start = Date.now();

      // Check trigger_config filters (extra constraints)
      if (automation.trigger_config) {
        const tcKeys = Object.keys(automation.trigger_config);
        const matches = tcKeys.every((key) => {
          const expected = automation.trigger_config[key];
          const actual = data?.[key] ?? payload[key];
          return String(actual).toLowerCase() === String(expected).toLowerCase();
        });
        if (!matches) continue; // skip — trigger filter didn't match
      }

      const context = {
        companyId,
        entityId,
        empId,
        data: data || {},
        triggerType,
        automationId: automation.automation_id,
      };

      const result = await runWorkflow(automation, context);
      const duration = Date.now() - start;

      console.log(`[AutomationEngine] Automation "${automation.name}" (${automation.automation_id}) completed in ${duration}ms — ${result.status || (result.ok ? 'SUCCESS' : 'FAILURE')}`);
      if (!result.ok) {
        console.log(`[AutomationEngine] Failed steps:`, result.steps.filter(s => s.error).map(s => `${s.nodeId}: ${s.error}`).join(', '));
      }

      // Persist log
      await automationRepo.insertLog({
        automation_id: automation.automation_id,
        company_id: companyId,
        trigger_type: triggerType,
        trigger_entity_id: entityId || null,
        trigger_payload: payload,
        status: result.status || (result.ok ? "SUCCESS" : "FAILURE"),
        steps: result.steps,
        error_message: result.ok ? null : result.steps.find((s) => s.error)?.error || "Unknown error",
        duration_ms: duration,
      });

      // Update denormalised stats
      await automationRepo.incrementStats(automation.automation_id, result.ok);
    }
  } catch (err) {
    console.error(`[AutomationEngine] Unhandled error for "${triggerType}":`, err);
  }
};

/* =====================================================
   BOOTSTRAP — Subscribe to all CRM events
===================================================== */

export const initAutomationEngine = () => {
  // Subscribe to every known trigger type
  for (const [triggerType, eventName] of Object.entries(TRIGGER_TO_EVENT)) {
    eventBus.on(eventName, (payload) => handleEvent(triggerType, payload));
  }
  console.log("⚡ Automation engine initialised — listening to", Object.keys(TRIGGER_TO_EVENT).length, "event types");
};
