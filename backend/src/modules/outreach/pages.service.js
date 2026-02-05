/**
 * Outreach Pages Service
 * Handles business logic for the landing page builder feature
 */
import { db } from "../../config/db.js";
import crypto from "crypto";

/**
 * Generate a URL-friendly slug from a title
 */
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
};

/**
 * Generate a unique access token for contact-specific page links
 */
const generateAccessToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Ensure slug is unique within company
 */
const ensureUniqueSlug = async (companyId, baseSlug, excludePageId = null) => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const [existing] = await db.query(
      `SELECT page_id FROM outreach_pages 
       WHERE company_id = ? AND slug = ? ${excludePageId ? "AND page_id != ?" : ""}`,
      excludePageId ? [companyId, slug, excludePageId] : [companyId, slug]
    );

    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/* ---------------------------------------------------
   PAGE CRUD OPERATIONS
--------------------------------------------------- */

/**
 * Create a new outreach page
 */
export const createPage = async (companyId, empId, pageData) => {
  const { title, description, metaTitle, metaDescription, ogImageUrl } = pageData;

  const baseSlug = generateSlug(title);
  const slug = await ensureUniqueSlug(companyId, baseSlug);

  const [result] = await db.query(
    `INSERT INTO outreach_pages 
     (company_id, created_by_emp_id, title, slug, description, meta_title, meta_description, og_image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, empId, title, slug, description, metaTitle, metaDescription, ogImageUrl]
  );

  return getPageById(result.insertId, companyId);
};

/**
 * Get page by ID with components
 */
export const getPageById = async (pageId, companyId) => {
  const [pages] = await db.query(
    `SELECT p.*, e.name as created_by_name, e.email as created_by_email
     FROM outreach_pages p
     LEFT JOIN employees e ON p.created_by_emp_id = e.emp_id
     WHERE p.page_id = ? AND p.company_id = ?`,
    [pageId, companyId]
  );

  if (pages.length === 0) return null;

  const page = pages[0];

  // Fetch components
  const [components] = await db.query(
    `SELECT * FROM outreach_page_components 
     WHERE page_id = ? 
     ORDER BY sort_order ASC`,
    [pageId]
  );

  // Parse JSON config for each component
  page.components = components.map((c) => ({
    ...c,
    config: typeof c.config === "string" ? JSON.parse(c.config) : c.config,
  }));

  return page;
};

/**
 * Get page by slug (for public access)
 */
export const getPageBySlug = async (companyId, slug) => {
  const [pages] = await db.query(
    `SELECT * FROM outreach_pages 
     WHERE company_id = ? AND slug = ? AND status = 'published'`,
    [companyId, slug]
  );

  if (pages.length === 0) return null;

  const page = pages[0];

  // Increment view count
  await db.query(
    `UPDATE outreach_pages SET view_count = view_count + 1 WHERE page_id = ?`,
    [page.page_id]
  );

  // Fetch visible components only
  const [components] = await db.query(
    `SELECT * FROM outreach_page_components 
     WHERE page_id = ? AND is_visible = TRUE
     ORDER BY sort_order ASC`,
    [page.page_id]
  );

  page.components = components.map((c) => ({
    ...c,
    config: typeof c.config === "string" ? JSON.parse(c.config) : c.config,
  }));

  return page;
};

/**
 * Get page by slug only (no company ID - for simplified public access)
 */
export const getPageBySlugOnly = async (slug) => {
  const [pages] = await db.query(
    `SELECT * FROM outreach_pages 
     WHERE slug = ? AND status = 'published'`,
    [slug]
  );

  if (pages.length === 0) return null;

  const page = pages[0];

  // Increment view count
  await db.query(
    `UPDATE outreach_pages SET view_count = view_count + 1 WHERE page_id = ?`,
    [page.page_id]
  );

  // Fetch visible components only
  const [components] = await db.query(
    `SELECT * FROM outreach_page_components 
     WHERE page_id = ? AND is_visible = TRUE
     ORDER BY sort_order ASC`,
    [page.page_id]
  );

  page.components = components.map((c) => ({
    ...c,
    config: typeof c.config === "string" ? JSON.parse(c.config) : c.config,
  }));

  return page;
};

/**
 * Get all pages for a company
 */
export const getPages = async (companyId, filters = {}) => {
  const { status, createdBy, search, limit = 50, offset = 0 } = filters;

  let query = `
    SELECT p.*, e.name as created_by_name,
           (SELECT COUNT(*) FROM outreach_page_components WHERE page_id = p.page_id) as component_count,
           (SELECT COUNT(*) FROM outreach_form_responses WHERE page_id = p.page_id) as response_count
    FROM outreach_pages p
    LEFT JOIN employees e ON p.created_by_emp_id = e.emp_id
    WHERE p.company_id = ?
  `;
  const params = [companyId];

  if (status) {
    query += " AND p.status = ?";
    params.push(status);
  }

  if (createdBy) {
    query += " AND p.created_by_emp_id = ?";
    params.push(createdBy);
  }

  if (search) {
    query += " AND (p.title LIKE ? OR p.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY p.updated_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [pages] = await db.query(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM outreach_pages p
    WHERE p.company_id = ?
  `;
  const countParams = [companyId];

  if (status) {
    countQuery += " AND p.status = ?";
    countParams.push(status);
  }
  if (createdBy) {
    countQuery += " AND p.created_by_emp_id = ?";
    countParams.push(createdBy);
  }
  if (search) {
    countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
    countParams.push(`%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.query(countQuery, countParams);

  return {
    pages,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

/**
 * Update page metadata
 */
export const updatePage = async (pageId, companyId, updates) => {
  const allowedFields = [
    "title",
    "description",
    "meta_title",
    "meta_description",
    "og_image_url",
    "status",
  ];

  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (allowedFields.includes(snakeKey)) {
      setClauses.push(`${snakeKey} = ?`);
      params.push(value);
    }
  }

  // Handle slug update if title changes
  if (updates.title) {
    const newSlug = await ensureUniqueSlug(companyId, generateSlug(updates.title), pageId);
    setClauses.push("slug = ?");
    params.push(newSlug);
  }

  // Handle publish date
  if (updates.status === "published") {
    setClauses.push("published_at = COALESCE(published_at, NOW())");
  }

  if (setClauses.length === 0) {
    return getPageById(pageId, companyId);
  }

  params.push(pageId, companyId);

  await db.query(
    `UPDATE outreach_pages SET ${setClauses.join(", ")} 
     WHERE page_id = ? AND company_id = ?`,
    params
  );

  return getPageById(pageId, companyId);
};

/**
 * Delete a page
 */
export const deletePage = async (pageId, companyId) => {
  const [result] = await db.query(
    `DELETE FROM outreach_pages WHERE page_id = ? AND company_id = ?`,
    [pageId, companyId]
  );
  return result.affectedRows > 0;
};

/**
 * Duplicate a page
 */
export const duplicatePage = async (pageId, companyId, empId) => {
  const original = await getPageById(pageId, companyId);
  if (!original) throw new Error("Page not found");

  // Create new page with copied metadata
  const newSlug = await ensureUniqueSlug(companyId, `${original.slug}-copy`);

  const [result] = await db.query(
    `INSERT INTO outreach_pages 
     (company_id, created_by_emp_id, title, slug, description, meta_title, meta_description, og_image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [
      companyId,
      empId,
      `${original.title} (Copy)`,
      newSlug,
      original.description,
      original.meta_title,
      original.meta_description,
      original.og_image_url,
    ]
  );

  const newPageId = result.insertId;

  // Copy components
  if (original.components?.length > 0) {
    const componentValues = original.components.map((c) => [
      newPageId,
      c.component_type,
      c.sort_order,
      JSON.stringify(c.config),
      c.is_visible,
    ]);

    await db.query(
      `INSERT INTO outreach_page_components 
       (page_id, component_type, sort_order, config, is_visible)
       VALUES ?`,
      [componentValues]
    );
  }

  return getPageById(newPageId, companyId);
};

/* ---------------------------------------------------
   COMPONENT OPERATIONS
--------------------------------------------------- */

/**
 * Add a component to a page
 */
export const addComponent = async (pageId, companyId, componentData) => {
  // Verify page belongs to company
  const [pages] = await db.query(
    `SELECT page_id FROM outreach_pages WHERE page_id = ? AND company_id = ?`,
    [pageId, companyId]
  );

  if (pages.length === 0) throw new Error("Page not found");

  const { componentType, config, sortOrder, isVisible = true } = componentData;

  // If no sort order, add to end
  let order = sortOrder;
  if (order === undefined || order === null) {
    const [maxOrder] = await db.query(
      `SELECT MAX(sort_order) as max_order FROM outreach_page_components WHERE page_id = ?`,
      [pageId]
    );
    order = (maxOrder[0].max_order ?? -1) + 1;
  }

  const [result] = await db.query(
    `INSERT INTO outreach_page_components 
     (page_id, component_type, sort_order, config, is_visible)
     VALUES (?, ?, ?, ?, ?)`,
    [pageId, componentType, order, JSON.stringify(config), isVisible]
  );

  const [component] = await db.query(
    `SELECT * FROM outreach_page_components WHERE component_id = ?`,
    [result.insertId]
  );

  return {
    ...component[0],
    config: typeof component[0].config === "string" ? JSON.parse(component[0].config) : component[0].config,
  };
};

/**
 * Update a component
 */
export const updateComponent = async (componentId, pageId, companyId, updates) => {
  // Verify ownership
  const [components] = await db.query(
    `SELECT c.* FROM outreach_page_components c
     JOIN outreach_pages p ON c.page_id = p.page_id
     WHERE c.component_id = ? AND c.page_id = ? AND p.company_id = ?`,
    [componentId, pageId, companyId]
  );

  if (components.length === 0) throw new Error("Component not found");

  const setClauses = [];
  const params = [];

  if (updates.config !== undefined) {
    setClauses.push("config = ?");
    params.push(JSON.stringify(updates.config));
  }
  if (updates.sortOrder !== undefined) {
    setClauses.push("sort_order = ?");
    params.push(updates.sortOrder);
  }
  if (updates.isVisible !== undefined) {
    setClauses.push("is_visible = ?");
    params.push(updates.isVisible);
  }
  if (updates.componentType !== undefined) {
    setClauses.push("component_type = ?");
    params.push(updates.componentType);
  }

  if (setClauses.length === 0) {
    return components[0];
  }

  params.push(componentId);

  await db.query(
    `UPDATE outreach_page_components SET ${setClauses.join(", ")} WHERE component_id = ?`,
    params
  );

  const [updated] = await db.query(
    `SELECT * FROM outreach_page_components WHERE component_id = ?`,
    [componentId]
  );

  return {
    ...updated[0],
    config: typeof updated[0].config === "string" ? JSON.parse(updated[0].config) : updated[0].config,
  };
};

/**
 * Delete a component
 */
export const deleteComponent = async (componentId, pageId, companyId) => {
  const [result] = await db.query(
    `DELETE c FROM outreach_page_components c
     JOIN outreach_pages p ON c.page_id = p.page_id
     WHERE c.component_id = ? AND c.page_id = ? AND p.company_id = ?`,
    [componentId, pageId, companyId]
  );
  return result.affectedRows > 0;
};

/**
 * Reorder components
 */
export const reorderComponents = async (pageId, companyId, componentOrders) => {
  // Verify page ownership
  const [pages] = await db.query(
    `SELECT page_id FROM outreach_pages WHERE page_id = ? AND company_id = ?`,
    [pageId, companyId]
  );

  if (pages.length === 0) throw new Error("Page not found");

  // Update each component's order
  for (const { componentId, sortOrder } of componentOrders) {
    await db.query(
      `UPDATE outreach_page_components 
       SET sort_order = ? 
       WHERE component_id = ? AND page_id = ?`,
      [sortOrder, componentId, pageId]
    );
  }

  return getPageById(pageId, companyId);
};

/* ---------------------------------------------------
   CONTACT SHARING
--------------------------------------------------- */

/**
 * Share page with contacts
 */
export const shareWithContacts = async (pageId, companyId, empId, contactIds) => {
  // Verify page
  const [pages] = await db.query(
    `SELECT page_id FROM outreach_pages WHERE page_id = ? AND company_id = ?`,
    [pageId, companyId]
  );

  if (pages.length === 0) throw new Error("Page not found");

  const results = [];

  for (const contactId of contactIds) {
    try {
      // Check if already shared
      const [existing] = await db.query(
        `SELECT id, access_token FROM outreach_page_contacts 
         WHERE page_id = ? AND contact_id = ?`,
        [pageId, contactId]
      );

      if (existing.length > 0) {
        results.push({
          contactId,
          accessToken: existing[0].access_token,
          alreadyShared: true,
        });
        continue;
      }

      const token = generateAccessToken();

      await db.query(
        `INSERT INTO outreach_page_contacts 
         (page_id, contact_id, access_token, sent_by_emp_id, sent_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [pageId, contactId, token, empId]
      );

      results.push({
        contactId,
        accessToken: token,
        alreadyShared: false,
      });
    } catch (error) {
      results.push({
        contactId,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Get page sharing status
 */
export const getPageSharing = async (pageId, companyId, filters = {}) => {
  const { limit = 50, offset = 0 } = filters;

  const [contacts] = await db.query(
    `SELECT pc.*, c.name as contact_name, c.email as contact_email, c.company as contact_company
     FROM outreach_page_contacts pc
     JOIN contacts c ON pc.contact_id = c.contact_id
     JOIN outreach_pages p ON pc.page_id = p.page_id
     WHERE pc.page_id = ? AND p.company_id = ?
     ORDER BY pc.sent_at DESC
     LIMIT ? OFFSET ?`,
    [pageId, companyId, parseInt(limit), parseInt(offset)]
  );

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM outreach_page_contacts pc
     JOIN outreach_pages p ON pc.page_id = p.page_id
     WHERE pc.page_id = ? AND p.company_id = ?`,
    [pageId, companyId]
  );

  return {
    contacts,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

/* ---------------------------------------------------
   PAGE ANALYTICS
--------------------------------------------------- */

/**
 * Get page analytics
 */
export const getPageAnalytics = async (pageId, companyId, days = 30) => {
  // Verify ownership
  const [pages] = await db.query(
    `SELECT * FROM outreach_pages WHERE page_id = ? AND company_id = ?`,
    [pageId, companyId]
  );

  if (pages.length === 0) throw new Error("Page not found");

  // Get daily visits
  const [dailyVisits] = await db.query(
    `SELECT DATE(visited_at) as date, COUNT(*) as visits
     FROM outreach_page_visits
     WHERE page_id = ? AND visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(visited_at)
     ORDER BY date ASC`,
    [pageId, days]
  );

  // Get form response stats
  const [responseStats] = await db.query(
    `SELECT status, COUNT(*) as count
     FROM outreach_form_responses
     WHERE page_id = ?
     GROUP BY status`,
    [pageId]
  );

  // Get top referrers
  const [topReferrers] = await db.query(
    `SELECT referrer, COUNT(*) as count
     FROM outreach_page_visits
     WHERE page_id = ? AND referrer IS NOT NULL AND referrer != ''
     GROUP BY referrer
     ORDER BY count DESC
     LIMIT 10`,
    [pageId]
  );

  // Get UTM sources
  const [utmSources] = await db.query(
    `SELECT utm_source, utm_medium, utm_campaign, COUNT(*) as count
     FROM outreach_page_visits
     WHERE page_id = ? AND utm_source IS NOT NULL
     GROUP BY utm_source, utm_medium, utm_campaign
     ORDER BY count DESC
     LIMIT 10`,
    [pageId]
  );

  return {
    page: pages[0],
    dailyVisits,
    responseStats,
    topReferrers,
    utmSources,
    totals: {
      views: pages[0].view_count,
      responses: responseStats.reduce((sum, r) => sum + r.count, 0),
    },
  };
};

/**
 * Record page visit
 */
export const recordVisit = async (pageId, visitData) => {
  const { contactId, ipAddress, userAgent, referrer, utm } = visitData;

  await db.query(
    `INSERT INTO outreach_page_visits 
     (page_id, contact_id, ip_address, user_agent, referrer, 
      utm_source, utm_medium, utm_campaign, utm_term, utm_content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pageId,
      contactId || null,
      ipAddress,
      userAgent,
      referrer,
      utm?.source || null,
      utm?.medium || null,
      utm?.campaign || null,
      utm?.term || null,
      utm?.content || null,
    ]
  );

  // Update contact tracking if we have a token
  if (contactId) {
    await db.query(
      `UPDATE outreach_page_contacts 
       SET view_count = view_count + 1,
           first_viewed_at = COALESCE(first_viewed_at, NOW()),
           last_viewed_at = NOW()
       WHERE page_id = ? AND contact_id = ?`,
      [pageId, contactId]
    );
  }
};
