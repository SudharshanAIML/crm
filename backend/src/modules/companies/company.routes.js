import { Router } from "express";
import * as companyController from "./company.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../utils/constants.js";

const router = Router();

/* ---------------------------------------------------
   GET COMPANY STATS (ADMIN)
--------------------------------------------------- */
/**
 * @route   GET /companies/stats
 * @desc    Get company statistics
 * @access  Admin
 */
router.get(
  "/stats",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  companyController.getCompanyStats
);

/* ---------------------------------------------------
   SEARCH COMPANIES
--------------------------------------------------- */
/**
 * @route   GET /companies/search?q=query
 * @desc    Search companies by name or domain
 * @access  Employee
 */
router.get(
  "/search",
  authenticateEmployee,
  companyController.searchCompanies
);

/* ---------------------------------------------------
   GET ALL COMPANIES
--------------------------------------------------- */
/**
 * @route   GET /companies
 * @desc    Get all companies (paginated)
 * @access  Employee
 */
router.get(
  "/",
  authenticateEmployee,
  companyController.getAllCompanies
);

/* ---------------------------------------------------
   CREATE COMPANY
--------------------------------------------------- */
/**
 * @route   POST /companies
 * @desc    Create new company
 * @access  Admin
 */
router.post(
  "/",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  companyController.createCompany
);

/* ---------------------------------------------------
   GET COMPANY BY ID
--------------------------------------------------- */
/**
 * @route   GET /companies/:id
 * @desc    Get company details
 * @access  Employee
 */
router.get(
  "/:id",
  authenticateEmployee,
  companyController.getCompanyById
);

/* ---------------------------------------------------
   UPDATE COMPANY
--------------------------------------------------- */
/**
 * @route   PATCH /companies/:id
 * @desc    Update company details
 * @access  Admin
 */
router.patch(
  "/:id",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  companyController.updateCompany
);

/* ---------------------------------------------------
   DELETE COMPANY
--------------------------------------------------- */
/**
 * @route   DELETE /companies/:id
 * @desc    Delete company
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  companyController.deleteCompany
);

export default router;
