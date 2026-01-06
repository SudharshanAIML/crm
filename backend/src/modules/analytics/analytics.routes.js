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

/* ---------------------------------------------------
   ADMIN: GET TEAM MEMBERS
--------------------------------------------------- */
/**
 * @route   GET /analytics/team-members
 * @desc    Get all team members with their performance stats
 * @access  Admin
 */
router.get(
  "/team-members",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  analyticsController.getTeamMembers
);

/* ---------------------------------------------------
   ADMIN: GET EMPLOYEE DETAILS
--------------------------------------------------- */
/**
 * @route   GET /analytics/employee/:empId
 * @desc    Get specific employee details
 * @access  Admin
 */
router.get(
  "/employee/:empId",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  analyticsController.getEmployeeById
);

/* ---------------------------------------------------
   ADMIN: GET EMPLOYEE ACTIVITIES
--------------------------------------------------- */
/**
 * @route   GET /analytics/employee/:empId/activities
 * @desc    Get employee's recent activities (sessions)
 * @access  Admin
 */
router.get(
  "/employee/:empId/activities",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  analyticsController.getEmployeeActivities
);

/* ---------------------------------------------------
   ADMIN: GET EMPLOYEE CONTACTS
--------------------------------------------------- */
/**
 * @route   GET /analytics/employee/:empId/contacts
 * @desc    Get employee's assigned contacts/leads
 * @access  Admin
 */
router.get(
  "/employee/:empId/contacts",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  analyticsController.getEmployeeContacts
);

/* ---------------------------------------------------
   EMPLOYEE: GET COMPREHENSIVE ANALYTICS
--------------------------------------------------- */
/**
 * @route   GET /analytics/comprehensive
 * @desc    Get comprehensive analytics for employee dashboard
 * @access  Employee
 */
router.get(
  "/comprehensive",
  authenticateEmployee,
  analyticsController.getComprehensiveAnalytics
);

/* ---------------------------------------------------
   ADMIN: GET COMPANY-WIDE ANALYTICS
--------------------------------------------------- */
/**
 * @route   GET /analytics/admin
 * @desc    Get company-wide analytics for admin dashboard
 * @access  Admin
 */
router.get(
  "/admin",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  analyticsController.getAdminAnalytics
);

/* ---------------------------------------------------
   GET PRODUCT ANALYTICS
--------------------------------------------------- */
/**
 * @route   GET /analytics/products
 * @desc    Get product analytics and performance
 * @access  Employee
 */
router.get(
  "/products",
  authenticateEmployee,
  analyticsController.getProductAnalytics
);

/* ---------------------------------------------------
   GET PRODUCT DETAILS
--------------------------------------------------- */
/**
 * @route   GET /analytics/products/:productName
 * @desc    Get detailed analytics for a specific product
 * @access  Employee
 */
router.get(
  "/products/:productName",
  authenticateEmployee,
  analyticsController.getProductDetails
);

export default router;
