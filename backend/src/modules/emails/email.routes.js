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
   EMAIL CONNECTION STATUS
--------------------------------------------------- */
/**
 * @route   GET /emails/connection-status
 * @desc    Check if employee has connected Gmail
 * @access  Employee
 */
router.get(
  "/connection-status",
  authenticateEmployee,
  emailController.getConnectionStatus
);

/* ---------------------------------------------------
   CONNECT GMAIL (GET AUTH URL)
--------------------------------------------------- */
/**
 * @route   GET /emails/connect
 * @desc    Get OAuth URL to connect Gmail account
 * @access  Employee
 */
router.get(
  "/connect",
  authenticateEmployee,
  emailController.getConnectUrl
);

/* ---------------------------------------------------
   OAUTH CALLBACK
--------------------------------------------------- */
/**
 * @route   GET /emails/callback
 * @desc    Handle OAuth callback from Google
 * @access  Public (redirect from Google)
 */
router.get(
  "/callback",
  emailController.handleCallback
);

/* ---------------------------------------------------
   DISCONNECT GMAIL
--------------------------------------------------- */
/**
 * @route   DELETE /emails/disconnect
 * @desc    Disconnect Gmail account
 * @access  Employee
 */
router.delete(
  "/disconnect",
  authenticateEmployee,
  emailController.disconnectEmail
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
 * @desc    Send custom email to contact via connected Gmail
 * @access  Employee
 */
router.post(
  "/",
  authenticateEmployee,
  emailController.sendEmail
);

export default router;
