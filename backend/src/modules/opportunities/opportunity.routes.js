import { Router } from "express";
import * as opportunityController from "./opportunity.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   CREATE OPPORTUNITY (SQL → OPPORTUNITY)
--------------------------------------------------- */
/**
 * @route   POST /opportunities
 * @desc    Create opportunity from SQL contact
 * @access  Employee
 */
router.post(
  "/",
  authenticateEmployee,
  opportunityController.createOpportunity
);

/* ---------------------------------------------------
   GET OPPORTUNITY BY ID
--------------------------------------------------- */
/**
 * @route   GET /opportunities/:id
 * @desc    Get opportunity details
 * @access  Employee
 */
router.get(
  "/:id",
  authenticateEmployee,
  opportunityController.getOpportunityById
);

/* ---------------------------------------------------
   CLOSE OPPORTUNITY AS WON (→ CUSTOMER)
--------------------------------------------------- */
/**
 * @route   POST /opportunities/:id/won
 * @desc    Mark opportunity as WON
 * @access  Employee
 */
router.post(
  "/:id/won",
  authenticateEmployee,
  opportunityController.markAsWon
);

/* ---------------------------------------------------
   CLOSE OPPORTUNITY AS LOST (→ DORMANT)
--------------------------------------------------- */
/**
 * @route   POST /opportunities/:id/lost
 * @desc    Mark opportunity as LOST and move contact to DORMANT
 * @access  Employee
 */
router.post(
  "/:id/lost",
  authenticateEmployee,
  opportunityController.markAsLost
);

export default router;
