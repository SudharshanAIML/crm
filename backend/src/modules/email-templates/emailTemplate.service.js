import * as repo from "./emailTemplate.repo.js";

/* ---------------------------------------------------
   SUPPORTED DYNAMIC VARIABLES
   Returned to the frontend for the variable-inserter UI
--------------------------------------------------- */
export const TEMPLATE_VARIABLES = [
  { key: "contact_name",    label: "Contact Name",    example: "Jane Doe" },
  { key: "contact_email",   label: "Contact Email",   example: "jane@acme.com" },
  { key: "contact_phone",   label: "Contact Phone",   example: "+1 555-0123" },
  { key: "contact_job_title", label: "Job Title",     example: "VP of Sales" },
  { key: "contact_status",  label: "Pipeline Stage",  example: "MQL" },
  { key: "company_name",    label: "Company Name",    example: "Acme Corp" },
  { key: "employee_name",   label: "Your Name",       example: "John Smith" },
  { key: "employee_email",  label: "Your Email",      example: "john@company.com" },
];

/* ---------------------------------------------------
   INTERPOLATE VARIABLES INTO TEMPLATE TEXT
   Replaces {{variable_key}} with actual values
--------------------------------------------------- */
export const interpolate = (text, variables = {}) => {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
};

/* ---------------------------------------------------
   CREATE TEMPLATE
--------------------------------------------------- */
export const createTemplate = async ({ companyId, empId, name, subject, body, category, targetStage }) => {
  if (!name || !subject || !body) {
    throw new Error("Name, subject, and body are required");
  }

  if (name.length > 255) throw new Error("Template name cannot exceed 255 characters");
  if (subject.length > 500) throw new Error("Subject cannot exceed 500 characters");

  const templateId = await repo.create({
    company_id: companyId,
    created_by: empId,
    name: name.trim(),
    subject: subject.trim(),
    body: body.trim(),
    category: category || "GENERAL",
    target_stage: targetStage || null,
  });

  return repo.getById(templateId);
};

/* ---------------------------------------------------
   GET TEMPLATE BY ID (with ownership check)
--------------------------------------------------- */
export const getTemplate = async (templateId, companyId) => {
  const template = await repo.getById(templateId);
  if (!template) throw new Error("Template not found");
  if (template.company_id !== companyId) throw new Error("Access denied");
  return template;
};

/* ---------------------------------------------------
   LIST TEMPLATES
--------------------------------------------------- */
export const listTemplates = async (companyId, filters = {}) => {
  return repo.list(companyId, filters);
};

/* ---------------------------------------------------
   UPDATE TEMPLATE
--------------------------------------------------- */
export const updateTemplate = async (templateId, companyId, updates) => {
  const template = await repo.getById(templateId);
  if (!template) throw new Error("Template not found");
  if (template.company_id !== companyId) throw new Error("Access denied");

  if (updates.name !== undefined && updates.name.trim().length === 0) {
    throw new Error("Template name cannot be empty");
  }

  await repo.update(templateId, updates);
  return repo.getById(templateId);
};

/* ---------------------------------------------------
   DELETE TEMPLATE
--------------------------------------------------- */
export const deleteTemplate = async (templateId, companyId) => {
  const template = await repo.getById(templateId);
  if (!template) throw new Error("Template not found");
  if (template.company_id !== companyId) throw new Error("Access denied");

  await repo.hardDelete(templateId);
};

/* ---------------------------------------------------
   DUPLICATE TEMPLATE
--------------------------------------------------- */
export const duplicateTemplate = async (templateId, companyId, empId) => {
  const template = await repo.getById(templateId);
  if (!template) throw new Error("Template not found");
  if (template.company_id !== companyId) throw new Error("Access denied");

  const newId = await repo.duplicate(templateId, empId);
  return repo.getById(newId);
};

/* ---------------------------------------------------
   PREVIEW TEMPLATE (interpolate with sample data)
--------------------------------------------------- */
export const previewTemplate = async (templateId, companyId, sampleData = {}) => {
  const template = await getTemplate(templateId, companyId);

  // Build preview variables — use provided data or fall back to examples
  const vars = {};
  for (const v of TEMPLATE_VARIABLES) {
    vars[v.key] = sampleData[v.key] || v.example;
  }

  return {
    subject: interpolate(template.subject, vars),
    body: interpolate(template.body, vars),
    variables_used: vars,
  };
};

/* ---------------------------------------------------
   INCREMENT USAGE (called when template is used to send)
--------------------------------------------------- */
export const recordUsage = async (templateId) => {
  await repo.incrementUsage(templateId);
};

/* ---------------------------------------------------
   GET AVAILABLE VARIABLES
--------------------------------------------------- */
export const getVariables = () => {
  return TEMPLATE_VARIABLES;
};
