import * as employeeRepo from "./employee.repo.js";
import { USER_ROLES } from "../../utils/constants.js";

/* ---------------------------------------------------
   CREATE EMPLOYEE
--------------------------------------------------- */
export const createEmployee = async (data) => {
  // Validate required fields
  if (!data.name) {
    throw new Error("Employee name is required");
  }

  if (!data.email) {
    throw new Error("Employee email is required");
  }

  // Check if email already exists
  const existing = await employeeRepo.getByEmail(data.email);
  if (existing) {
    throw new Error("Employee with this email already exists");
  }

  // Validate role if provided
  if (data.role && !Object.values(USER_ROLES).includes(data.role)) {
    throw new Error("Invalid employee role");
  }

  const empId = await employeeRepo.createEmployee(data);

  return empId;
};

/* ---------------------------------------------------
   GET EMPLOYEE BY ID
--------------------------------------------------- */
export const getEmployeeById = async (empId) => {
  return await employeeRepo.getById(empId);
};

/* ---------------------------------------------------
   GET EMPLOYEE BY EMAIL
--------------------------------------------------- */
export const getEmployeeByEmail = async (email) => {
  return await employeeRepo.getByEmail(email);
};

/* ---------------------------------------------------
   GET EMPLOYEES BY COMPANY
--------------------------------------------------- */
export const getEmployeesByCompany = async (companyId) => {
  return await employeeRepo.getByCompany(companyId);
};

/* ---------------------------------------------------
   UPDATE EMPLOYEE
--------------------------------------------------- */
export const updateEmployee = async (empId, updates) => {
  const employee = await employeeRepo.getById(empId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  // Validate role if being updated
  if (updates.role && !Object.values(USER_ROLES).includes(updates.role)) {
    throw new Error("Invalid employee role");
  }

  await employeeRepo.updateEmployee(empId, updates);
};

/* ---------------------------------------------------
   DELETE EMPLOYEE
--------------------------------------------------- */
export const deleteEmployee = async (empId) => {
  const employee = await employeeRepo.getById(empId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  await employeeRepo.deleteEmployee(empId);
};
