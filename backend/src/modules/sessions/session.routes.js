import { Router } from "express";
import * as sessionController from "./session.controller.js";
// import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   CREATE SESSION (MQL / SQL)
--------------------------------------------------- */
/**
 * @route   POST /sessions
 * @desc    Create a marketing or sales session
 * @access  Employee
 *
 * body:
 * {
 *   contactId,
 *   stage: "MQL" | "SQL",
 *   sessionNo,
 *   rating,
 *   sessionStatus,
 *   remarks
 * }
 */
router.post(
  "/",
  /* authenticateEmployee, */
  sessionController.createSession
);

/* ---------------------------------------------------
   GET SESSIONS FOR A CONTACT
--------------------------------------------------- */
/**
 * @route   GET /sessions/contact/:contactId
 * @desc    Get all sessions for a contact
 * @access  Employee
 */
router.get(
  "/contact/:contactId",
  /* authenticateEmployee, */
  sessionController.getSessionsByContact
);

/* ---------------------------------------------------
   GET SESSIONS BY STAGE (MQL / SQL)
--------------------------------------------------- */
/**
 * @route   GET /sessions/contact/:contactId/:stage
 * @desc    Get sessions by stage for a contact
 * @access  Employee
 */
router.get(
  "/contact/:contactId/:stage",
  /* authenticateEmployee, */
  sessionController.getSessionsByStage
);

/* ---------------------------------------------------
   UPDATE SESSION (OPTIONAL)
--------------------------------------------------- */
/**
 * @route   PATCH /sessions/:id
 * @desc    Update session rating / status / remarks
 * @access  Employee
 */
router.patch(
  "/:id",
  /* authenticateEmployee, */
  sessionController.updateSession
);

/* ---------------------------------------------------
   DELETE SESSION (OPTIONAL / ADMIN)
--------------------------------------------------- */
/**
 * @route   DELETE /sessions/:id
 * @desc    Delete a session
 * @access  Employee / Admin
 */
router.delete(
  "/:id",
  /* authenticateEmployee, */
  sessionController.deleteSession
);

export default router;
