import { Router } from "express";
import multer from "multer";
import * as outreachController from "./outreach.controller.js";
import * as autopilotController from "./autopilot.controller.js";
import * as pagesController from "./pages.controller.js";
import * as formResponsesController from "./formResponses.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, DOC, and TXT are allowed."));
    }
  },
});

/* ---------------------------------------------------
   DOCUMENT MANAGEMENT
--------------------------------------------------- */

/**
 * @route   POST /outreach/documents
 * @desc    Upload company document for RAG
 * @access  Employee
 */
router.post(
  "/documents",
  authenticateEmployee,
  upload.single("document"),
  outreachController.uploadDocument
);

/**
 * @route   GET /outreach/documents
 * @desc    Get uploaded documents
 * @access  Employee
 */
router.get(
  "/documents",
  authenticateEmployee,
  outreachController.getDocuments
);

/**
 * @route   DELETE /outreach/documents/:documentId
 * @desc    Delete a document
 * @access  Employee
 */
router.delete(
  "/documents/:documentId",
  authenticateEmployee,
  outreachController.deleteDocument
);

/* ---------------------------------------------------
   RAG STATUS
--------------------------------------------------- */

/**
 * @route   GET /outreach/rag-status
 * @desc    Get RAG configuration status
 * @access  Employee
 */
router.get(
  "/rag-status",
  authenticateEmployee,
  outreachController.getRAGStatus
);

/* ---------------------------------------------------
   CONTACT FILTERING
--------------------------------------------------- */

/**
 * @route   GET /outreach/contacts
 * @desc    Get contacts by status threshold
 * @access  Employee
 */
router.get(
  "/contacts",
  authenticateEmployee,
  outreachController.getContactsByThreshold
);

/* ---------------------------------------------------
   EMAIL GENERATION & SENDING
--------------------------------------------------- */

/**
 * @route   POST /outreach/generate
 * @desc    Generate outreach emails using RAG
 * @access  Employee
 */
router.post(
  "/generate",
  authenticateEmployee,
  outreachController.generateEmails
);

/**
 * @route   POST /outreach/send
 * @desc    Send generated outreach emails
 * @access  Employee
 */
router.post(
  "/send",
  authenticateEmployee,
  outreachController.sendEmails
);

/* ---------------------------------------------------
   AUTOPILOT
--------------------------------------------------- */

/**
 * @route   POST /outreach/autopilot/start
 * @desc    Start autopilot mode
 * @access  Employee
 */
router.post(
  "/autopilot/start",
  authenticateEmployee,
  autopilotController.startAutopilot
);

/**
 * @route   POST /outreach/autopilot/stop
 * @desc    Stop autopilot mode
 * @access  Employee
 */
router.post(
  "/autopilot/stop",
  authenticateEmployee,
  autopilotController.stopAutopilot
);

/**
 * @route   GET /outreach/autopilot/status
 * @desc    Get autopilot status
 * @access  Employee
 */
router.get(
  "/autopilot/status",
  authenticateEmployee,
  autopilotController.getAutopilotStatus
);

/**
 * @route   GET /outreach/autopilot/log
 * @desc    Get autopilot activity log
 * @access  Employee
 */
router.get(
  "/autopilot/log",
  authenticateEmployee,
  autopilotController.getAutopilotLog
);

/* ---------------------------------------------------
   PAGE BUILDER - CRUD
--------------------------------------------------- */

/**
 * @route   POST /outreach/pages
 * @desc    Create a new outreach page
 * @access  Employee
 */
router.post(
  "/pages",
  authenticateEmployee,
  pagesController.createPage
);

/**
 * @route   GET /outreach/pages
 * @desc    Get all pages for company
 * @access  Employee
 */
router.get(
  "/pages",
  authenticateEmployee,
  pagesController.getPages
);

/**
 * @route   GET /outreach/pages/:pageId
 * @desc    Get a single page with components
 * @access  Employee
 */
router.get(
  "/pages/:pageId",
  authenticateEmployee,
  pagesController.getPage
);

/**
 * @route   PATCH /outreach/pages/:pageId
 * @desc    Update page metadata
 * @access  Employee
 */
router.patch(
  "/pages/:pageId",
  authenticateEmployee,
  pagesController.updatePage
);

/**
 * @route   DELETE /outreach/pages/:pageId
 * @desc    Delete a page
 * @access  Employee
 */
router.delete(
  "/pages/:pageId",
  authenticateEmployee,
  pagesController.deletePage
);

/**
 * @route   POST /outreach/pages/:pageId/duplicate
 * @desc    Duplicate a page
 * @access  Employee
 */
router.post(
  "/pages/:pageId/duplicate",
  authenticateEmployee,
  pagesController.duplicatePage
);

/* ---------------------------------------------------
   PAGE BUILDER - COMPONENTS
--------------------------------------------------- */

/**
 * @route   POST /outreach/pages/:pageId/components
 * @desc    Add component to page
 * @access  Employee
 */
router.post(
  "/pages/:pageId/components",
  authenticateEmployee,
  pagesController.addComponent
);

/**
 * @route   PATCH /outreach/pages/:pageId/components/:componentId
 * @desc    Update a component
 * @access  Employee
 */
router.patch(
  "/pages/:pageId/components/:componentId",
  authenticateEmployee,
  pagesController.updateComponent
);

/**
 * @route   DELETE /outreach/pages/:pageId/components/:componentId
 * @desc    Delete a component
 * @access  Employee
 */
router.delete(
  "/pages/:pageId/components/:componentId",
  authenticateEmployee,
  pagesController.deleteComponent
);

/**
 * @route   PUT /outreach/pages/:pageId/components/reorder
 * @desc    Reorder components on a page
 * @access  Employee
 */
router.put(
  "/pages/:pageId/components/reorder",
  authenticateEmployee,
  pagesController.reorderComponents
);

/* ---------------------------------------------------
   PAGE BUILDER - SHARING
--------------------------------------------------- */

/**
 * @route   POST /outreach/pages/:pageId/share
 * @desc    Share page with contacts
 * @access  Employee
 */
router.post(
  "/pages/:pageId/share",
  authenticateEmployee,
  pagesController.shareWithContacts
);

/**
 * @route   GET /outreach/pages/:pageId/sharing
 * @desc    Get page sharing status
 * @access  Employee
 */
router.get(
  "/pages/:pageId/sharing",
  authenticateEmployee,
  pagesController.getPageSharing
);

/* ---------------------------------------------------
   PAGE BUILDER - ANALYTICS
--------------------------------------------------- */

/**
 * @route   GET /outreach/pages/:pageId/analytics
 * @desc    Get page analytics
 * @access  Employee
 */
router.get(
  "/pages/:pageId/analytics",
  authenticateEmployee,
  pagesController.getPageAnalytics
);

/* ---------------------------------------------------
   FORM RESPONSES
--------------------------------------------------- */

/**
 * @route   GET /outreach/responses
 * @desc    Get all form responses
 * @access  Employee
 */
router.get(
  "/responses",
  authenticateEmployee,
  formResponsesController.getAllResponses
);

/**
 * @route   GET /outreach/pages/:pageId/responses
 * @desc    Get responses for a specific page
 * @access  Employee
 */
router.get(
  "/pages/:pageId/responses",
  authenticateEmployee,
  formResponsesController.getPageResponses
);

/**
 * @route   GET /outreach/pages/:pageId/responses/export
 * @desc    Export responses as CSV
 * @access  Employee
 */
router.get(
  "/pages/:pageId/responses/export",
  authenticateEmployee,
  formResponsesController.exportResponses
);

/**
 * @route   GET /outreach/responses/:responseId
 * @desc    Get single response
 * @access  Employee
 */
router.get(
  "/responses/:responseId",
  authenticateEmployee,
  formResponsesController.getResponse
);

/**
 * @route   PATCH /outreach/responses/:responseId
 * @desc    Update response status
 * @access  Employee
 */
router.patch(
  "/responses/:responseId",
  authenticateEmployee,
  formResponsesController.updateResponse
);

/**
 * @route   DELETE /outreach/responses/:responseId
 * @desc    Delete response
 * @access  Employee
 */
router.delete(
  "/responses/:responseId",
  authenticateEmployee,
  formResponsesController.deleteResponse
);

/**
 * @route   POST /outreach/responses/bulk-update
 * @desc    Bulk update response status
 * @access  Employee
 */
router.post(
  "/responses/bulk-update",
  authenticateEmployee,
  formResponsesController.bulkUpdateResponses
);

export default router;
