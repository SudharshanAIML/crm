import { Router } from "express";
import * as employeeController from "./employee.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../utils/constants.js";

const router = Router();

/* ---------------------------------------------------
   GET CURRENT USER PROFILE
--------------------------------------------------- */
/**
 * @route   GET /employees/me
 * @desc    Get current logged-in employee profile
 * @access  Employee
 */
router.get(
  "/me",
  authenticateEmployee,
  employeeController.getProfile
);

/* ---------------------------------------------------
   CREATE EMPLOYEE (ADMIN)
--------------------------------------------------- */
/**
 * @route   POST /employees
 * @desc    Create new employee
 * @access  Admin
 */
router.post(
  "/",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  employeeController.createEmployee
);

/* ---------------------------------------------------
   GET EMPLOYEE BY ID
--------------------------------------------------- */
/**
 * @route   GET /employees/:id
 * @desc    Get employee by ID
 * @access  Employee
 */
router.get(
  "/:id",
  authenticateEmployee,
  employeeController.getEmployeeById
);

/* ---------------------------------------------------
   GET EMPLOYEES BY COMPANY
--------------------------------------------------- */
/**
 * @route   GET /employees/company/:companyId
 * @desc    Get all employees of a company
 * @access  Employee
 */
router.get(
  "/company/:companyId",
  authenticateEmployee,
  employeeController.getEmployeesByCompany
);

/* ---------------------------------------------------
   UPDATE EMPLOYEE
--------------------------------------------------- */
/**
 * @route   PATCH /employees/:id
 * @desc    Update employee details
 * @access  Admin / Self
 */
router.patch(
  "/:id",
  authenticateEmployee,
  employeeController.updateEmployee
);

/* ---------------------------------------------------
   DELETE EMPLOYEE
--------------------------------------------------- */
/**
 * @route   DELETE /employees/:id
 * @desc    Delete employee
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticateEmployee,
  authorizeRoles(USER_ROLES.ADMIN),
  employeeController.deleteEmployee
);

export default router;
