import { Router } from "express";
import * as ctrl from "./abTest.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   PUBLIC TRACKING ENDPOINTS (no auth — called by email clients)
--------------------------------------------------- */

// Open-tracking pixel — <img src="…/api/ab-track/open/:token">
router.get("/open/:token", ctrl.trackOpen);

// Click-tracking redirect — <a href="…/api/ab-track/click/:token?url=…">
router.get("/click/:token", ctrl.trackClick);

/* ---------------------------------------------------
   AUTHENTICATED ENDPOINTS (mounted at /api/ab-tests)
--------------------------------------------------- */

// List all A/B tests for the company
router.get("/", authenticateEmployee, ctrl.list);

// Get a single A/B test
router.get("/:id", authenticateEmployee, ctrl.getById);

// Get results / analytics for a test
router.get("/:id/results", authenticateEmployee, ctrl.getResults);

// Create a new A/B test (DRAFT)
router.post("/", authenticateEmployee, ctrl.create);

// Send the A/B test to contacts
router.post("/:id/send", authenticateEmployee, ctrl.send);

// Update a DRAFT A/B test
router.put("/:id", authenticateEmployee, ctrl.update);

// Delete an A/B test
router.delete("/:id", authenticateEmployee, ctrl.remove);

export default router;
