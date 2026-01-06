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

/* ===================================================
   GMAIL INBOX/SENT/DRAFTS ROUTES
=================================================== */

/**
 * @route   GET /emails/gmail/inbox
 * @desc    Get inbox messages from Gmail
 * @access  Employee
 */
router.get(
  "/gmail/inbox",
  authenticateEmployee,
  emailController.getGmailInbox
);

/**
 * @route   GET /emails/gmail/sent
 * @desc    Get sent messages from Gmail
 * @access  Employee
 */
router.get(
  "/gmail/sent",
  authenticateEmployee,
  emailController.getGmailSent
);

/**
 * @route   GET /emails/gmail/crm-sent
 * @desc    Get only CRM-sent emails (with X-CRM-Sent header)
 * @access  Employee
 */
router.get(
  "/gmail/crm-sent",
  authenticateEmployee,
  emailController.getGmailCRMSent
);

/**
 * @route   GET /emails/gmail/drafts
 * @desc    Get drafts from Gmail
 * @access  Employee
 */
router.get(
  "/gmail/drafts",
  authenticateEmployee,
  emailController.getGmailDrafts
);

/**
 * @route   GET /emails/gmail/search
 * @desc    Search Gmail messages
 * @access  Employee
 */
router.get(
  "/gmail/search",
  authenticateEmployee,
  emailController.searchGmail
);

/**
 * @route   GET /emails/gmail/message/:messageId
 * @desc    Get single message with full content
 * @access  Employee
 */
router.get(
  "/gmail/message/:messageId",
  authenticateEmployee,
  emailController.getGmailMessage
);

/**
 * @route   POST /emails/gmail/message/:messageId/read
 * @desc    Mark message as read
 * @access  Employee
 */
router.post(
  "/gmail/message/:messageId/read",
  authenticateEmployee,
  emailController.markMessageRead
);

/**
 * @route   POST /emails/gmail/message/:messageId/unread
 * @desc    Mark message as unread
 * @access  Employee
 */
router.post(
  "/gmail/message/:messageId/unread",
  authenticateEmployee,
  emailController.markMessageUnread
);

/**
 * @route   DELETE /emails/gmail/message/:messageId
 * @desc    Trash a message
 * @access  Employee
 */
router.delete(
  "/gmail/message/:messageId",
  authenticateEmployee,
  emailController.trashGmailMessage
);

/**
 * @route   GET /emails/gmail/draft/:draftId
 * @desc    Get single draft with full content
 * @access  Employee
 */
router.get(
  "/gmail/draft/:draftId",
  authenticateEmployee,
  emailController.getGmailDraft
);

/**
 * @route   POST /emails/gmail/drafts
 * @desc    Create a new draft
 * @access  Employee
 */
router.post(
  "/gmail/drafts",
  authenticateEmployee,
  emailController.createGmailDraft
);

/**
 * @route   PUT /emails/gmail/draft/:draftId
 * @desc    Update a draft
 * @access  Employee
 */
router.put(
  "/gmail/draft/:draftId",
  authenticateEmployee,
  emailController.updateGmailDraft
);

/**
 * @route   DELETE /emails/gmail/draft/:draftId
 * @desc    Delete a draft
 * @access  Employee
 */
router.delete(
  "/gmail/draft/:draftId",
  authenticateEmployee,
  emailController.deleteGmailDraft
);

/**
 * @route   POST /emails/gmail/draft/:draftId/send
 * @desc    Send a draft
 * @access  Employee
 */
router.post(
  "/gmail/draft/:draftId/send",
  authenticateEmployee,
  emailController.sendGmailDraft
);

export default router;
