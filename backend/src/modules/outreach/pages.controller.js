/**
 * Outreach Pages Controller
 * Handles HTTP requests for the landing page builder feature
 */
import * as pagesService from "./pages.service.js";
import { getRealIP } from "../../utils/ipUtils.js";

/* ---------------------------------------------------
   PAGE CRUD
--------------------------------------------------- */

/**
 * Create a new page
 * POST /outreach/pages
 */
export const createPage = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const page = await pagesService.createPage(companyId, empId, req.body);
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pages for company
 * GET /outreach/pages
 */
export const getPages = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const filters = {
      status: req.query.status,
      createdBy: req.query.createdBy,
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset,
    };
    const result = await pagesService.getPages(companyId, filters);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single page by ID
 * GET /outreach/pages/:pageId
 */
export const getPage = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const page = await pagesService.getPageById(pageId, companyId);

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a page
 * PATCH /outreach/pages/:pageId
 */
export const updatePage = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const page = await pagesService.updatePage(pageId, companyId, req.body);

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a page
 * DELETE /outreach/pages/:pageId
 */
export const deletePage = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const deleted = await pagesService.deletePage(pageId, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.json({ success: true, message: "Page deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate a page
 * POST /outreach/pages/:pageId/duplicate
 */
export const duplicatePage = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const { pageId } = req.params;
    const page = await pagesService.duplicatePage(pageId, companyId, empId);
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish a page
 * POST /outreach/pages/:pageId/publish
 */
export const publishPage = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const page = await pagesService.updatePage(pageId, companyId, { status: "published" });

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive a page
 * POST /outreach/pages/:pageId/archive
 */
export const archivePage = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const page = await pagesService.updatePage(pageId, companyId, { status: "archived" });

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   COMPONENT OPERATIONS
--------------------------------------------------- */

/**
 * Add component to page
 * POST /outreach/pages/:pageId/components
 */
export const addComponent = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const component = await pagesService.addComponent(pageId, companyId, req.body);
    res.status(201).json({ success: true, data: component });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a component
 * PATCH /outreach/pages/:pageId/components/:componentId
 */
export const updateComponent = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId, componentId } = req.params;
    const component = await pagesService.updateComponent(componentId, pageId, companyId, req.body);
    res.json({ success: true, data: component });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a component
 * DELETE /outreach/pages/:pageId/components/:componentId
 */
export const deleteComponent = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId, componentId } = req.params;
    const deleted = await pagesService.deleteComponent(componentId, pageId, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Component not found" });
    }

    res.json({ success: true, message: "Component deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder components
 * PUT /outreach/pages/:pageId/components/reorder
 */
export const reorderComponents = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const { orders } = req.body; // [{componentId, sortOrder}, ...]
    const page = await pagesService.reorderComponents(pageId, companyId, orders);
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   CONTACT SHARING
--------------------------------------------------- */

/**
 * Share page with contacts
 * POST /outreach/pages/:pageId/share
 */
export const shareWithContacts = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const { pageId } = req.params;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "contactIds array is required" 
      });
    }

    const results = await pagesService.shareWithContacts(pageId, companyId, empId, contactIds);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * Get page sharing status
 * GET /outreach/pages/:pageId/sharing
 */
export const getPageSharing = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const filters = {
      limit: req.query.limit,
      offset: req.query.offset,
    };
    const result = await pagesService.getPageSharing(pageId, companyId, filters);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   ANALYTICS
--------------------------------------------------- */

/**
 * Get page analytics
 * GET /outreach/pages/:pageId/analytics
 */
export const getPageAnalytics = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const analytics = await pagesService.getPageAnalytics(pageId, companyId, days);
    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   PUBLIC ENDPOINTS (for page viewing)
--------------------------------------------------- */

/**
 * Get published page by slug only (simplified public)
 * GET /public/p/:slug
 */
export const getPublicPageBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await pagesService.getPageBySlugOnly(slug);

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    // Record visit
    await pagesService.recordVisit(page.page_id, {
      ipAddress: getRealIP(req),
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referer"),
      utm: {
        source: req.query.utm_source,
        medium: req.query.utm_medium,
        campaign: req.query.utm_campaign,
        term: req.query.utm_term,
        content: req.query.utm_content,
      },
    });

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Get published page by slug (public)
 * GET /public/pages/:companySlug/:pageSlug
 */
export const getPublicPage = async (req, res, next) => {
  try {
    const { companyId, pageSlug } = req.params;
    const page = await pagesService.getPageBySlug(companyId, pageSlug);

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    // Record visit
    await pagesService.recordVisit(page.page_id, {
      ipAddress: getRealIP(req),
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referer"),
      utm: {
        source: req.query.utm_source,
        medium: req.query.utm_medium,
        campaign: req.query.utm_campaign,
        term: req.query.utm_term,
        content: req.query.utm_content,
      },
    });

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Get page by access token (personalized link)
 * GET /public/pages/t/:token
 */
export const getPageByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find page contact record
    const { db } = await import("../../config/db.js");
    const [records] = await db.query(
      `SELECT pc.*, p.company_id, p.slug
       FROM outreach_page_contacts pc
       JOIN outreach_pages p ON pc.page_id = p.page_id
       WHERE pc.access_token = ? AND p.status = 'published'`,
      [token]
    );

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    const record = records[0];
    const page = await pagesService.getPageBySlug(record.company_id, record.slug);

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    // Record visit with contact association
    await pagesService.recordVisit(page.page_id, {
      contactId: record.contact_id,
      ipAddress: getRealIP(req),
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referer"),
      utm: {
        source: req.query.utm_source,
        medium: req.query.utm_medium,
        campaign: req.query.utm_campaign,
        term: req.query.utm_term,
        content: req.query.utm_content,
      },
    });

    res.json({ 
      success: true, 
      data: page,
      contactId: record.contact_id,
    });
  } catch (error) {
    next(error);
  }
};
