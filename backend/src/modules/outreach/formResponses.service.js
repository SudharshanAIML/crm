/**
 * Form Responses Service
 * Handles form submissions and response management for outreach pages
 */
import { db } from "../../config/db.js";

/* ---------------------------------------------------
   FORM SUBMISSION (PUBLIC)
--------------------------------------------------- */

/**
 * Submit form response (public endpoint)
 */
export const submitFormResponse = async (pageId, componentId, formData, metadata = {}) => {
  const { contactId, ipAddress, userAgent, referrer } = metadata;

  // Verify the component exists and is a form
  const [components] = await db.query(
    `SELECT c.*, p.status as page_status, p.company_id
     FROM outreach_page_components c
     JOIN outreach_pages p ON c.page_id = p.page_id
     WHERE c.component_id = ? AND c.page_id = ? AND p.status = 'published'`,
    [componentId, pageId]
  );

  if (components.length === 0) {
    throw new Error("Form not found or page not published");
  }

  const component = components[0];
  if (component.component_type !== "form") {
    throw new Error("Component is not a form");
  }

  // Validate required fields from form config
  const config = typeof component.config === "string" 
    ? JSON.parse(component.config) 
    : component.config;
    
  const requiredFields = (config.fields || [])
    .filter(f => f.required)
    .map(f => f.name);

  for (const field of requiredFields) {
    if (!formData[field] || formData[field].toString().trim() === "") {
      throw new Error(`Field '${field}' is required`);
    }
  }

  // Sanitize form data - only keep fields defined in the form
  const allowedFields = (config.fields || []).map(f => f.name);
  const sanitizedData = {};
  for (const [key, value] of Object.entries(formData)) {
    if (allowedFields.includes(key)) {
      sanitizedData[key] = value;
    }
  }

  const [result] = await db.query(
    `INSERT INTO outreach_form_responses 
     (page_id, component_id, contact_id, form_data, ip_address, user_agent, referrer)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      pageId,
      componentId,
      contactId || null,
      JSON.stringify(sanitizedData),
      ipAddress,
      userAgent,
      referrer,
    ]
  );

  // Update conversion tracking if contact is known
  if (contactId) {
    await db.query(
      `UPDATE outreach_page_contacts 
       SET converted = TRUE, converted_at = NOW()
       WHERE page_id = ? AND contact_id = ?`,
      [pageId, contactId]
    );
  }

  return {
    responseId: result.insertId,
    message: config.successMessage || "Thank you for your submission!",
  };
};

/* ---------------------------------------------------
   RESPONSE MANAGEMENT (AUTHENTICATED)
--------------------------------------------------- */

/**
 * Get form responses for a page
 */
export const getPageResponses = async (pageId, companyId, filters = {}) => {
  const { 
    componentId, 
    status, 
    startDate, 
    endDate,
    search,
    limit = 50, 
    offset = 0 
  } = filters;

  let query = `
    SELECT r.*, 
           c.name as contact_name, 
           c.email as contact_email,
           c.company as contact_company,
           comp.component_type,
           comp.config as component_config,
           e.name as viewed_by_name
    FROM outreach_form_responses r
    JOIN outreach_pages p ON r.page_id = p.page_id
    JOIN outreach_page_components comp ON r.component_id = comp.component_id
    LEFT JOIN contacts c ON r.contact_id = c.contact_id
    LEFT JOIN employees e ON r.viewed_by_emp_id = e.emp_id
    WHERE r.page_id = ? AND p.company_id = ?
  `;
  const params = [pageId, companyId];

  if (componentId) {
    query += " AND r.component_id = ?";
    params.push(componentId);
  }

  if (status) {
    query += " AND r.status = ?";
    params.push(status);
  }

  if (startDate) {
    query += " AND r.submitted_at >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND r.submitted_at <= ?";
    params.push(endDate);
  }

  if (search) {
    query += " AND (r.form_data LIKE ? OR c.name LIKE ? OR c.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += " ORDER BY r.submitted_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [responses] = await db.query(query, params);

  // Parse JSON data
  const parsedResponses = responses.map(r => ({
    ...r,
    form_data: typeof r.form_data === "string" ? JSON.parse(r.form_data) : r.form_data,
    component_config: typeof r.component_config === "string" 
      ? JSON.parse(r.component_config) 
      : r.component_config,
  }));

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total 
    FROM outreach_form_responses r
    JOIN outreach_pages p ON r.page_id = p.page_id
    WHERE r.page_id = ? AND p.company_id = ?
  `;
  const countParams = [pageId, companyId];

  if (componentId) {
    countQuery += " AND r.component_id = ?";
    countParams.push(componentId);
  }
  if (status) {
    countQuery += " AND r.status = ?";
    countParams.push(status);
  }
  if (startDate) {
    countQuery += " AND r.submitted_at >= ?";
    countParams.push(startDate);
  }
  if (endDate) {
    countQuery += " AND r.submitted_at <= ?";
    countParams.push(endDate);
  }

  const [countResult] = await db.query(countQuery, countParams);

  return {
    responses: parsedResponses,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

/**
 * Get all responses for company (across all pages)
 */
export const getCompanyResponses = async (companyId, filters = {}) => {
  const { 
    status, 
    pageId,
    startDate, 
    endDate,
    limit = 50, 
    offset = 0 
  } = filters;

  let query = `
    SELECT r.*, 
           p.title as page_title,
           p.slug as page_slug,
           c.name as contact_name, 
           c.email as contact_email,
           comp.config as component_config
    FROM outreach_form_responses r
    JOIN outreach_pages p ON r.page_id = p.page_id
    JOIN outreach_page_components comp ON r.component_id = comp.component_id
    LEFT JOIN contacts c ON r.contact_id = c.contact_id
    WHERE p.company_id = ?
  `;
  const params = [companyId];

  if (pageId) {
    query += " AND r.page_id = ?";
    params.push(pageId);
  }

  if (status) {
    query += " AND r.status = ?";
    params.push(status);
  }

  if (startDate) {
    query += " AND r.submitted_at >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND r.submitted_at <= ?";
    params.push(endDate);
  }

  query += " ORDER BY r.submitted_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [responses] = await db.query(query, params);

  const parsedResponses = responses.map(r => ({
    ...r,
    form_data: typeof r.form_data === "string" ? JSON.parse(r.form_data) : r.form_data,
    component_config: typeof r.component_config === "string" 
      ? JSON.parse(r.component_config) 
      : r.component_config,
  }));

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total 
    FROM outreach_form_responses r
    JOIN outreach_pages p ON r.page_id = p.page_id
    WHERE p.company_id = ?
  `;
  const countParams = [companyId];

  if (pageId) {
    countQuery += " AND r.page_id = ?";
    countParams.push(pageId);
  }
  if (status) {
    countQuery += " AND r.status = ?";
    countParams.push(status);
  }

  const [countResult] = await db.query(countQuery, countParams);

  // Get stats
  const [stats] = await db.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN r.status = 'new' THEN 1 ELSE 0 END) as new_count,
       SUM(CASE WHEN r.status = 'viewed' THEN 1 ELSE 0 END) as viewed_count,
       SUM(CASE WHEN r.status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
       SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END) as converted_count
     FROM outreach_form_responses r
     JOIN outreach_pages p ON r.page_id = p.page_id
     WHERE p.company_id = ?`,
    [companyId]
  );

  return {
    responses: parsedResponses,
    total: countResult[0].total,
    stats: stats[0],
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

/**
 * Get single response by ID
 */
export const getResponseById = async (responseId, companyId) => {
  const [responses] = await db.query(
    `SELECT r.*, 
            p.title as page_title,
            p.slug as page_slug,
            c.name as contact_name, 
            c.email as contact_email,
            c.phone as contact_phone,
            c.company as contact_company,
            comp.config as component_config,
            e.name as viewed_by_name
     FROM outreach_form_responses r
     JOIN outreach_pages p ON r.page_id = p.page_id
     JOIN outreach_page_components comp ON r.component_id = comp.component_id
     LEFT JOIN contacts c ON r.contact_id = c.contact_id
     LEFT JOIN employees e ON r.viewed_by_emp_id = e.emp_id
     WHERE r.response_id = ? AND p.company_id = ?`,
    [responseId, companyId]
  );

  if (responses.length === 0) return null;

  const response = responses[0];
  return {
    ...response,
    form_data: typeof response.form_data === "string" 
      ? JSON.parse(response.form_data) 
      : response.form_data,
    component_config: typeof response.component_config === "string" 
      ? JSON.parse(response.component_config) 
      : response.component_config,
  };
};

/**
 * Update response status
 */
export const updateResponseStatus = async (responseId, companyId, empId, status, notes = null) => {
  // Verify ownership
  const [responses] = await db.query(
    `SELECT r.response_id FROM outreach_form_responses r
     JOIN outreach_pages p ON r.page_id = p.page_id
     WHERE r.response_id = ? AND p.company_id = ?`,
    [responseId, companyId]
  );

  if (responses.length === 0) {
    throw new Error("Response not found");
  }

  const updates = ["status = ?"];
  const params = [status];

  // Track who viewed/updated
  if (status === "viewed" || status === "contacted" || status === "converted") {
    updates.push("viewed_at = COALESCE(viewed_at, NOW())");
    updates.push("viewed_by_emp_id = COALESCE(viewed_by_emp_id, ?)");
    params.push(empId);
  }

  if (notes !== null) {
    updates.push("notes = ?");
    params.push(notes);
  }

  params.push(responseId);

  await db.query(
    `UPDATE outreach_form_responses SET ${updates.join(", ")} WHERE response_id = ?`,
    params
  );

  return getResponseById(responseId, companyId);
};

/**
 * Bulk update response status
 */
export const bulkUpdateStatus = async (responseIds, companyId, empId, status) => {
  if (!responseIds || responseIds.length === 0) {
    throw new Error("No response IDs provided");
  }

  const placeholders = responseIds.map(() => "?").join(",");

  await db.query(
    `UPDATE outreach_form_responses r
     JOIN outreach_pages p ON r.page_id = p.page_id
     SET r.status = ?, 
         r.viewed_at = COALESCE(r.viewed_at, NOW()),
         r.viewed_by_emp_id = COALESCE(r.viewed_by_emp_id, ?)
     WHERE r.response_id IN (${placeholders}) AND p.company_id = ?`,
    [status, empId, ...responseIds, companyId]
  );

  return { updated: responseIds.length };
};

/**
 * Delete response
 */
export const deleteResponse = async (responseId, companyId) => {
  const [result] = await db.query(
    `DELETE r FROM outreach_form_responses r
     JOIN outreach_pages p ON r.page_id = p.page_id
     WHERE r.response_id = ? AND p.company_id = ?`,
    [responseId, companyId]
  );
  return result.affectedRows > 0;
};

/**
 * Export responses to CSV format
 */
export const exportResponses = async (pageId, companyId, filters = {}) => {
  const result = await getPageResponses(pageId, companyId, { ...filters, limit: 10000 });
  
  if (result.responses.length === 0) {
    return { csv: "", count: 0 };
  }

  // Get all unique field names from form data
  const allFields = new Set();
  result.responses.forEach(r => {
    Object.keys(r.form_data || {}).forEach(k => allFields.add(k));
  });

  const fieldNames = Array.from(allFields);
  
  // Build CSV
  const headers = [
    "Response ID",
    "Submitted At",
    "Status",
    "Contact Name",
    "Contact Email",
    ...fieldNames,
    "Notes",
  ];

  const rows = result.responses.map(r => [
    r.response_id,
    r.submitted_at,
    r.status,
    r.contact_name || "",
    r.contact_email || "",
    ...fieldNames.map(f => r.form_data?.[f] || ""),
    r.notes || "",
  ]);

  // Escape CSV values
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map(row => row.map(escapeCSV).join(",")),
  ].join("\n");

  return { csv, count: result.responses.length };
};
