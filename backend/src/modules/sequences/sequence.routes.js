import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";
import * as ctrl from "./sequence.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateEmployee);

/* ── sequence CRUD ─────────────────────────────────── */
router.get("/",    ctrl.list);
router.post("/",   ctrl.create);
router.get("/:id", ctrl.getById);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

/* ── enrollment management ─────────────────────────── */
router.post("/:id/enroll",                           ctrl.enroll);
router.get("/:id/enrollments",                       ctrl.getEnrollments);
router.delete("/:id/enrollments/:enrollmentId",      ctrl.cancelEnrollment);
router.post("/:id/enrollments/:enrollmentId/pause",  ctrl.pauseEnrollment);
router.post("/:id/enrollments/:enrollmentId/resume", ctrl.resumeEnrollment);

/* ── contact-level view (used in contact detail panel) */
router.get("/contact/:contactId/enrollments", ctrl.getContactEnrollments);

export default router;
