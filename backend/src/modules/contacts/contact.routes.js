import { Router } from "express";
import * as contactController from "./contact.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/role.middleware.js";

const router = Router();

/* ---------------------------------------------------
   ADMIN ROUTES (Place before :id routes)
--------------------------------------------------- */

// Get all contacts with employee info (Admin only)
router.get(
  "/admin/all",
  authenticateEmployee,
  requireAdmin,
  contactController.getAllContactsAdmin
);

/* ---------------------------------------------------
   SEARCH ROUTE (Place before :id routes)
--------------------------------------------------- */

// Global search across all stages
router.get(
  "/search",
  authenticateEmployee,
  contactController.searchContacts
);

/* ---------------------------------------------------
   LEAD CREATION & VIEW
--------------------------------------------------- */

// Create new Lead (Employee)
router.post(
  "/",
  authenticateEmployee,
  contactController.createContact
);

// Get contacts by status (e.g., /contacts?status=MQL)
router.get(
  "/",
  authenticateEmployee,
  contactController.getContactsByStatus
);

// Get contact by ID
router.get(
  "/:id",
  authenticateEmployee,
  contactController.getContactById
);

// Update contact
router.patch(
  "/:id",
  authenticateEmployee,
  contactController.updateContact
);

/* ---------------------------------------------------
   AUTOMATED (SYSTEM) – LEAD → MQL
--------------------------------------------------- */

// Internal endpoint (Marketing Automation)
router.post(
  "/internal/lead-activity",
  contactController.handleLeadActivity
);

// Manual LEAD → MQL promotion
router.patch(
  "/:id/promote-mql",
  authenticateEmployee,
  contactController.promoteToMQL
);

/* ---------------------------------------------------
   EMPLOYEE-DRIVEN TRANSITIONS
--------------------------------------------------- */

// MQL → SQL
router.patch(
  "/:id/promote-sql",
  authenticateEmployee,
  contactController.promoteToSQL
);

// SQL → OPPORTUNITY
router.post(
  "/:id/opportunity",
  authenticateEmployee,
  contactController.convertToOpportunity
);

// Get contact financials (opportunities & deals)
router.get(
  "/:id/financials",
  authenticateEmployee,
  contactController.getContactFinancials
);

/* ---------------------------------------------------
   DEAL & CUSTOMER
--------------------------------------------------- */

// OPPORTUNITY → CUSTOMER (Deal Close)
router.post(
  "/opportunities/:id/close",
  authenticateEmployee,
  contactController.closeDeal
);

/* ---------------------------------------------------
   SYSTEM-DRIVEN
--------------------------------------------------- */

// CUSTOMER → EVANGELIST
router.post(
  "/:id/evangelist",
  authenticateEmployee,
  contactController.convertToEvangelist
);

// Move contact to DORMANT
router.patch(
  "/:id/dormant",
  authenticateEmployee,
  contactController.moveToDormant
);

export default router;
