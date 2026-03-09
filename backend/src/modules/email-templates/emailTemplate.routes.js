import { Router } from "express";
import * as ctrl from "./emailTemplate.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   GET AVAILABLE TEMPLATE VARIABLES
   Must be before /:id to avoid param conflict
--------------------------------------------------- */
/**
 * @route   GET /api/email-templates/variables
 * @desc    List supported dynamic variables (e.g. {{contact_name}})
 * @access  Employee
 */
router.get("/variables", authenticateEmployee, ctrl.getVariables);

/* ---------------------------------------------------
   LIST TEMPLATES
--------------------------------------------------- */
/**
 * @route   GET /api/email-templates
 * @desc    List email templates for the company
 * @query   category, targetStage, search, includeInactive
 * @access  Employee
 */
router.get("/", authenticateEmployee, ctrl.list);

/* ---------------------------------------------------
   CREATE TEMPLATE
--------------------------------------------------- */
/**
 * @route   POST /api/email-templates
 * @desc    Create a new email template
 * @body    { name, subject, body, category?, targetStage? }
 * @access  Employee
 */
router.post("/", authenticateEmployee, ctrl.create);

/* ---------------------------------------------------
   GET SINGLE TEMPLATE
--------------------------------------------------- */
/**
 * @route   GET /api/email-templates/:id
 * @desc    Get email template by ID
 * @access  Employee
 */
router.get("/:id", authenticateEmployee, ctrl.getById);

/* ---------------------------------------------------
   UPDATE TEMPLATE
--------------------------------------------------- */
/**
 * @route   PUT /api/email-templates/:id
 * @desc    Update an email template
 * @body    { name?, subject?, body?, category?, targetStage?, is_active? }
 * @access  Employee
 */
router.put("/:id", authenticateEmployee, ctrl.update);

/* ---------------------------------------------------
   DELETE TEMPLATE
--------------------------------------------------- */
/**
 * @route   DELETE /api/email-templates/:id
 * @desc    Permanently delete an email template
 * @access  Employee
 */
router.delete("/:id", authenticateEmployee, ctrl.remove);

/* ---------------------------------------------------
   DUPLICATE TEMPLATE
--------------------------------------------------- */
/**
 * @route   POST /api/email-templates/:id/duplicate
 * @desc    Clone an existing template
 * @access  Employee
 */
router.post("/:id/duplicate", authenticateEmployee, ctrl.duplicate);

/* ---------------------------------------------------
   PREVIEW TEMPLATE
--------------------------------------------------- */
/**
 * @route   POST /api/email-templates/:id/preview
 * @desc    Preview template with interpolated variables
 * @body    { contact_name?, company_name?, ... }
 * @access  Employee
 */
router.post("/:id/preview", authenticateEmployee, ctrl.preview);

export default router;
