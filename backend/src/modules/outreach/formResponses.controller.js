/**
 * Form Responses Controller
 * Handles HTTP requests for form submissions and response management
 */
import * as formResponsesService from "./formResponses.service.js";

/* ---------------------------------------------------
   PUBLIC FORM SUBMISSION
--------------------------------------------------- */

/**
 * Submit form response by slug (simplified public)
 * POST /public/p/:slug/submit
 */
export const submitFormBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { formData, componentId, contactId } = req.body;

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ 
        success: false, 
        message: "formData is required and must be an object" 
      });
    }

    // Get page by slug to find page_id
    const { db } = await import("../../config/db.js");
    const [pages] = await db.query(
      `SELECT page_id FROM outreach_pages WHERE slug = ? AND status = 'published'`,
      [slug]
    );

    if (pages.length === 0) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    const pageId = pages[0].page_id;

    // If componentId not provided, find the first form component on the page
    let targetComponentId = componentId;
    if (!targetComponentId) {
      const [components] = await db.query(
        `SELECT component_id FROM outreach_page_components 
         WHERE page_id = ? AND type = 'form' AND is_visible = TRUE 
         ORDER BY sort_order ASC LIMIT 1`,
        [pageId]
      );
      if (components.length > 0) {
        targetComponentId = components[0].component_id;
      }
    }

    const result = await formResponsesService.submitFormResponse(
      pageId,
      targetComponentId,
      formData,
      {
        contactId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        referrer: req.get("Referer"),
      }
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes("required") || error.message.includes("not found")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * Submit form response (public)
 * POST /public/pages/:pageId/forms/:componentId/submit
 */
export const submitForm = async (req, res, next) => {
  try {
    const { pageId, componentId } = req.params;
    const { formData, contactId } = req.body;

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ 
        success: false, 
        message: "formData is required and must be an object" 
      });
    }

    const result = await formResponsesService.submitFormResponse(
      pageId,
      componentId,
      formData,
      {
        contactId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        referrer: req.get("Referer"),
      }
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes("required") || error.message.includes("not found")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/* ---------------------------------------------------
   AUTHENTICATED RESPONSE MANAGEMENT
--------------------------------------------------- */

/**
 * Get responses for a specific page
 * GET /outreach/pages/:pageId/responses
 */
export const getPageResponses = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const filters = {
      componentId: req.query.componentId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const result = await formResponsesService.getPageResponses(pageId, companyId, filters);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all responses across pages
 * GET /outreach/responses
 */
export const getAllResponses = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const filters = {
      status: req.query.status,
      pageId: req.query.pageId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const result = await formResponsesService.getCompanyResponses(companyId, filters);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single response
 * GET /outreach/responses/:responseId
 */
export const getResponse = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { responseId } = req.params;

    const response = await formResponsesService.getResponseById(responseId, companyId);

    if (!response) {
      return res.status(404).json({ success: false, message: "Response not found" });
    }

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

/**
 * Update response status
 * PATCH /outreach/responses/:responseId
 */
export const updateResponse = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const { responseId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "status is required" });
    }

    const validStatuses = ["new", "viewed", "contacted", "converted"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
      });
    }

    const response = await formResponsesService.updateResponseStatus(
      responseId, 
      companyId, 
      empId, 
      status, 
      notes
    );
    
    res.json({ success: true, data: response });
  } catch (error) {
    if (error.message === "Response not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * Bulk update response status
 * POST /outreach/responses/bulk-update
 */
export const bulkUpdateResponses = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const { responseIds, status } = req.body;

    if (!responseIds || !Array.isArray(responseIds) || responseIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "responseIds array is required" 
      });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: "status is required" });
    }

    const result = await formResponsesService.bulkUpdateStatus(
      responseIds, 
      companyId, 
      empId, 
      status
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete response
 * DELETE /outreach/responses/:responseId
 */
export const deleteResponse = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { responseId } = req.params;

    const deleted = await formResponsesService.deleteResponse(responseId, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Response not found" });
    }

    res.json({ success: true, message: "Response deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Export responses as CSV
 * GET /outreach/pages/:pageId/responses/export
 */
export const exportResponses = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { pageId } = req.params;
    const filters = {
      componentId: req.query.componentId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const { csv, count } = await formResponsesService.exportResponses(pageId, companyId, filters);

    if (count === 0) {
      return res.status(404).json({ success: false, message: "No responses to export" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="responses-page-${pageId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
