import { Router } from "express";
import * as emailController from "./email.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   TRACK EMAIL CLICK (PUBLIC)
   This is the tracking link sent in emails
--------------------------------------------------- */
/**
 * @route   GET /track/:token
 * @desc    Track email click and trigger LEAD → MQL
 * @access  Public
 */
router.get(
  "/track/:token",
  emailController.trackClick
);

/* ---------------------------------------------------
   GET EMAILS BY CONTACT
--------------------------------------------------- */
/**
 * @route   GET /emails/contact/:contactId
 * @desc    Get all emails sent to a contact
 * @access  Employee
 */
router.get(
  "/contact/:contactId",
  authenticateEmployee,
  emailController.getEmailsByContact
);

/* ---------------------------------------------------
   SEND EMAIL
--------------------------------------------------- */
/**
 * @route   POST /emails
 * @desc    Send custom email to contact
 * @access  Employee
 */
router.post(
  "/",
  authenticateEmployee,
  emailController.sendEmail
);

export default router;
