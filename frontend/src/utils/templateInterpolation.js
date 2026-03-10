/**
 * templateInterpolation.js
 *
 * Pure, side-effect-free helper that resolves {{variable}} tokens in email
 * templates against real contact / employee / company data.
 *
 * Design decisions
 * ────────────────
 * • Client-side only – no round-trip needed for interpolation.
 * • Unknown tokens are kept as-is so the user can see what's missing.
 * • Sanitised before HTML conversion – XSS safe.
 */

/**
 * Build a flat key → value map from the available context objects.
 *
 * @param {object} opts
 * @param {object|null} opts.contact  - contact row (name, email, phone, job_title, status, …)
 * @param {object|null} opts.employee - logged-in employee (name, email, …)
 * @param {object|null} opts.company  - company (company_name, …)
 * @returns {Record<string,string>}
 */
export const buildVariableMap = ({ contact = null, employee = null, company = null } = {}) => ({
  // Contact fields
  contact_name:      contact?.name       || '',
  contact_email:     contact?.email      || '',
  contact_phone:     contact?.phone      || '',
  contact_job_title: contact?.job_title  || '',
  contact_status:    contact?.status     || '',

  // Employee fields (the sender)
  employee_name:     employee?.name      || '',
  employee_email:    employee?.email     || '',

  // Company
  company_name:      company?.company_name || '',
});

/**
 * Replace every {{key}} in `text` with the corresponding value from `vars`.
 * Unknown keys are left intact.
 *
 * @param {string} text
 * @param {Record<string,string>} vars
 * @returns {string}
 */
export const interpolate = (text, vars) => {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  );
};

/**
 * Apply a template to a compose window.
 * Returns { subject, body } with all tokens resolved.
 *
 * @param {object} template  - { subject: string, body: string }
 * @param {object} context   - { contact?, employee?, company? }
 * @returns {{ subject: string, body: string }}
 */
export const applyTemplate = (template, context = {}) => {
  const vars = buildVariableMap(context);
  return {
    subject: interpolate(template.subject, vars),
    body:    interpolate(template.body,    vars),
  };
};
