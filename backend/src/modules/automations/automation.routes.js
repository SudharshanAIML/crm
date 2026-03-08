import { Router } from "express";
import * as automationController from "./automation.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

// All automation routes require authentication
router.use(authenticateEmployee);

/* ---------------------------------------------------
   METADATA (for workflow builder UI)
--------------------------------------------------- */
router.get("/metadata", automationController.getMetadata);

/* ---------------------------------------------------
   ANALYTICS
--------------------------------------------------- */
router.get("/analytics", automationController.getAnalytics);

/* ---------------------------------------------------
   COMPANY-WIDE EXECUTION LOGS
--------------------------------------------------- */
router.get("/logs", automationController.getCompanyLogs);

/* ---------------------------------------------------
   LIST ALL AUTOMATIONS
--------------------------------------------------- */
router.get("/", automationController.list);

/* ---------------------------------------------------
   CREATE AUTOMATION
--------------------------------------------------- */
router.post("/", automationController.create);

/* ---------------------------------------------------
   GET SINGLE AUTOMATION
--------------------------------------------------- */
router.get("/:id", automationController.getById);

/* ---------------------------------------------------
   UPDATE AUTOMATION
--------------------------------------------------- */
router.patch("/:id", automationController.update);

/* ---------------------------------------------------
   DELETE AUTOMATION
--------------------------------------------------- */
router.delete("/:id", automationController.remove);

/* ---------------------------------------------------
   TOGGLE ENABLE/DISABLE
--------------------------------------------------- */
router.patch("/:id/toggle", automationController.toggle);

/* ---------------------------------------------------
   EXECUTION LOGS FOR SPECIFIC AUTOMATION
--------------------------------------------------- */
router.get("/:id/logs", automationController.getLogs);

export default router;
