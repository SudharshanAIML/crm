import { Router } from "express";
import * as analyticsController from "./analytics.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../utils/constants.js";

const router = Router();

/* ---------------------------------------------------
   GET DASHBOARD DATA
--------------------------------------------------- */
/**
 * @route   GET /analytics/dashboard
 * @desc    Get dashboard statistics
 * @access  Employee
 */
router.get(
  "/dashboard",
  authenticateEmployee,
  analyticsController.getDashboard
);

/* ---------------------------------------------------
   GET EMPLOYEE PERFORMANCE
--------------------------------------------------- */
/**
 * @route   GET /analytics/performance
 * @desc    Get employee performance metrics
 * @access  Admin
 */
router.get(
  "/performance",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  analyticsController.getEmployeePerformance
);

/* ---------------------------------------------------
   GET RECENT ACTIVITIES
--------------------------------------------------- */
/**
 * @route   GET /analytics/activities
 * @desc    Get recent activities/status changes
 * @access  Employee
 */
router.get(
  "/activities",
  authenticateEmployee,
  analyticsController.getRecentActivities
);

/* ---------------------------------------------------
   GET PIPELINE FUNNEL
--------------------------------------------------- */
/**
 * @route   GET /analytics/funnel
 * @desc    Get pipeline funnel data
 * @access  Employee
 */
router.get(
  "/funnel",
  authenticateEmployee,
  analyticsController.getPipelineFunnel
);

export default router;
