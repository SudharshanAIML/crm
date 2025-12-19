import { Router } from "express";
import * as dealController from "./deal.controller.js";
// import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   CREATE DEAL (Opportunity → WON)
--------------------------------------------------- */
/**
 * @route   POST /deals
 * @desc    Create deal for a WON opportunity
 * @access  Employee
 *
 * body:
 * {
 *   opportunityId,
 *   dealValue
 * }
 */
router.post(
  "/",
  /* authenticateEmployee, */
  dealController.createDeal
);

/* ---------------------------------------------------
   GET DEAL BY ID
--------------------------------------------------- */
/**
 * @route   GET /deals/:id
 * @desc    Get deal details
 * @access  Employee
 */
router.get(
  "/:id",
  /* authenticateEmployee, */
  dealController.getDealById
);

/* ---------------------------------------------------
   GET DEALS BY COMPANY
--------------------------------------------------- */
/**
 * @route   GET /deals/company/:companyId
 * @desc    Get all deals for a company
 * @access  Employee
 */
router.get(
  "/company/:companyId",
  /* authenticateEmployee, */
  dealController.getDealsByCompany
);

export default router;