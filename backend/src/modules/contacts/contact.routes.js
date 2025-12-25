import { Router } from "express";
import * as contactController from "./contact.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

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

export default router;
