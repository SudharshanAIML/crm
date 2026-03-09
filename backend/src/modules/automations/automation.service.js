import * as automationRepo from "./automation.repo.js";

/* =====================================================
   SUPPORTED TRIGGERS / ACTIONS / OPERATORS (metadata)
===================================================== */

export const TRIGGER_TYPES = [
  { id: "contact.created",        label: "Contact Created",        category: "Contact" },
  { id: "contact.updated",        label: "Contact Updated",        category: "Contact" },
  { id: "contact.status_changed", label: "Contact Status Changed", category: "Contact" },
  { id: "deal.stage_changed",     label: "Deal Stage Changed",     category: "Deal" },
  { id: "deal.won",               label: "Deal Won",               category: "Deal" },
  { id: "deal.lost",              label: "Deal Lost",              category: "Deal" },
  { id: "session.created",        label: "Session Booked",         category: "Session" },
  { id: "email.opened",           label: "Email Opened",           category: "Email" },
  { id: "email.clicked",          label: "Email Clicked",          category: "Email" },
  { id: "feedback.submitted",     label: "Feedback Submitted",     category: "Feedback" },
  { id: "task.created",           label: "Task Created",           category: "Task" },
];

export const ACTION_TYPES = [
  { id: "send_email",        label: "Send Email",           icon: "Mail" },
  { id: "send_notification", label: "Send Notification",    icon: "Bell" },
  { id: "assign_user",       label: "Assign Contact",       icon: "UserPlus" },
  { id: "create_task",       label: "Create Follow-up Task",icon: "ClipboardList" },
  { id: "update_field",      label: "Update Contact Field", icon: "Edit" },
  { id: "change_stage",      label: "Change Pipeline Stage",icon: "ArrowRightCircle" },
  { id: "add_tag",           label: "Add Tag / Label",      icon: "Tag" },
  { id: "trigger_webhook",   label: "Trigger Webhook",      icon: "Globe" },
];

export const OPERATORS = [
  { id: "eq",           label: "equals" },
  { id: "neq",          label: "does not equal" },
  { id: "gt",           label: "greater than" },
  { id: "gte",          label: "greater than or equal" },
  { id: "lt",           label: "less than" },
  { id: "lte",          label: "less than or equal" },
  { id: "contains",     label: "contains" },
  { id: "not_contains", label: "does not contain" },
  { id: "is_empty",     label: "is empty" },
  { id: "is_not_empty", label: "is not empty" },
];

export const CONDITION_FIELDS = [
  { id: "status",          label: "Contact Status",     type: "select", options: ["LEAD","MQL","SQL","OPPORTUNITY","CUSTOMER","EVANGELIST","DORMANT"] },
  { id: "temperature",     label: "Temperature",        type: "select", options: ["COLD","WARM","HOT"] },
  { id: "interest_score",  label: "Interest Score",     type: "number" },
  { id: "assigned_emp_id", label: "Assigned Employee",  type: "number" },
  { id: "deal_value",      label: "Deal Value",         type: "number" },
  { id: "expected_value",  label: "Expected Value",     type: "number" },
  { id: "rating",          label: "Session Rating",     type: "number" },
  { id: "source",          label: "Lead Source",        type: "text" },
  { id: "job_title",       label: "Job Title",          type: "text" },
  { id: "name",            label: "Contact Name",       type: "text" },
  { id: "email",           label: "Contact Email",      type: "text" },
];

/* =====================================================
   CRUD
===================================================== */

export const createAutomation = async (companyId, empId, data) => {
  // Validate trigger type
  if (!TRIGGER_TYPES.find((t) => t.id === data.trigger_type)) {
    throw new Error(`Invalid trigger type: ${data.trigger_type}`);
  }

  // Validate workflow nodes
  if (data.workflow && Array.isArray(data.workflow)) {
    for (const node of data.workflow) {
      if (!node.id || !node.type) throw new Error("Each workflow node must have id and type");
      if (node.type === "action" && !node.config?.action) throw new Error("Action nodes must have config.action");
      if (node.type === "condition" && !node.config?.field) throw new Error("Condition nodes must have config.field");
    }
  }

  return await automationRepo.create({
    company_id: companyId,
    created_by: empId,
    name: data.name,
    description: data.description,
    is_active: data.is_active || false,
    is_draft: data.is_draft !== undefined ? data.is_draft : true,
    trigger_type: data.trigger_type,
    trigger_config: data.trigger_config || null,
    workflow: data.workflow || [],
  });
};

export const getAutomation = async (automationId, companyId) => {
  const a = await automationRepo.getById(automationId);
  if (!a || a.company_id !== companyId) return null;
  return a;
};

export const listAutomations = async (companyId, options = {}) => {
  return await automationRepo.listByCompany(companyId, options);
};

export const updateAutomation = async (automationId, companyId, data) => {
  const existing = await automationRepo.getById(automationId);
  if (!existing || existing.company_id !== companyId) throw new Error("Automation not found");

  // Re-validate trigger if changed
  if (data.trigger_type && !TRIGGER_TYPES.find((t) => t.id === data.trigger_type)) {
    throw new Error(`Invalid trigger type: ${data.trigger_type}`);
  }

  await automationRepo.update(automationId, data);
  return await automationRepo.getById(automationId);
};

export const deleteAutomation = async (automationId, companyId) => {
  const existing = await automationRepo.getById(automationId);
  if (!existing || existing.company_id !== companyId) throw new Error("Automation not found");
  await automationRepo.remove(automationId);
};

export const toggleAutomation = async (automationId, companyId, active) => {
  const existing = await automationRepo.getById(automationId);
  if (!existing || existing.company_id !== companyId) throw new Error("Automation not found");
  await automationRepo.update(automationId, { is_active: active, is_draft: active ? false : existing.is_draft });
  return await automationRepo.getById(automationId);
};

/* =====================================================
   LOGS
===================================================== */

export const getExecutionLogs = async (automationId, companyId, options = {}) => {
  const a = await automationRepo.getById(automationId);
  if (!a || a.company_id !== companyId) throw new Error("Automation not found");
  const { logs, total } = await automationRepo.getLogsByAutomation(automationId, options);
  return {
    logs,
    total,
    automation: {
      automation_id: a.automation_id,
      name: a.name,
      description: a.description,
      trigger_type: a.trigger_type,
      is_active: a.is_active,
      is_draft: a.is_draft,
      total_runs: a.total_runs,
      success_runs: a.success_runs,
      failure_runs: a.failure_runs,
      last_run_at: a.last_run_at,
    },
  };
};

export const getCompanyLogs = async (companyId, options = {}) => {
  return await automationRepo.getLogsByCompany(companyId, options);
};

/* =====================================================
   ANALYTICS
===================================================== */

export const getAnalytics = async (companyId) => {
  return await automationRepo.getAnalytics(companyId);
};

/* =====================================================
   METADATA for frontend builder
===================================================== */

export const getBuilderMetadata = () => ({
  triggers: TRIGGER_TYPES,
  actions: ACTION_TYPES,
  operators: OPERATORS,
  conditionFields: CONDITION_FIELDS,
});
