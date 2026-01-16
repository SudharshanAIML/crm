import * as emailService from "./email.service.js";
import * as contactService from "../contacts/contact.service.js";
import * as gmailService from "../../services/gmail.service.js";
import * as emailQueue from "../../services/emailQueue.service.js";

/**
 * @desc   Track email click (LEAD → MQL conversion trigger)
 * @route  GET /track/:token
 * @access Public (tracking pixel/link)
 */
export const trackClick = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { type } = req.query;

    const { contactId } = await emailService.trackEmailClick(token);

    // Process lead activity (handles LEAD → MQL conversion)
    await contactService.processLeadActivity({ contactId, token });

    // If tracking pixel request, return 1x1 transparent gif
    if (type === "pixel") {
      const transparentPixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.end(transparentPixel);
    }

    // Redirect to landing page
    const redirectUrl = process.env.LANDING_PAGE_URL || "https://example.com/thank-you";
    res.redirect(redirectUrl);
  } catch (error) {
    // On error, still redirect but to a generic page
    res.redirect(process.env.LANDING_PAGE_URL || "https://example.com");
  }
};

/**
 * @desc   Get emails by contact
 * @route  GET /emails/contact/:contactId
 * @access Employee
 */
export const getEmailsByContact = async (req, res, next) => {
  try {
    const emails = await emailService.getEmailsByContact(req.params.contactId);
    res.json(emails);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Send custom email to contact
 * @route  POST /emails
 * @access Employee
 * @body   {contactId, subject, body, cc?, bcc?, isHtml?, attachments?}
 *         attachments: Array of {name: string, type: string, base64: string}
 * @response {emailId, jobId, queued} - Email is queued for background sending
 */
export const sendEmail = async (req, res, next) => {
  try {
    const { contactId, subject, body, cc, bcc, isHtml, attachments } = req.body;

    if (!contactId || !subject || !body) {
      return res.status(400).json({
        message: "contactId, subject, and body are required",
      });
    }

    // Validate attachments if provided
    if (attachments && Array.isArray(attachments)) {
      const totalSize = attachments.reduce((sum, att) => {
        // base64 is ~4/3 of original size
        return sum + (att.base64?.length || 0) * 0.75;
      }, 0);
      
      // Gmail limit is 25MB, we use 20MB to be safe
      if (totalSize > 20 * 1024 * 1024) {
        return res.status(400).json({
          message: "Total attachment size exceeds 20MB limit",
        });
      }
    }

    const result = await emailService.sendCustomEmail({
      contactId,
      empId: req.user?.empId,
      subject,
      body,
      cc,
      bcc,
      isHtml: isHtml || false,
      attachments: attachments || [],
    });

    // Return immediately - email will be sent in background
    res.status(202).json({
      message: "Email queued for sending",
      emailId: result.emailId,
      jobId: result.jobId,
      queued: true,
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account to send emails",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Get email job status
 * @route  GET /emails/job/:jobId
 * @access Employee
 */
export const getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = emailQueue.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        message: "Job not found",
      });
    }
    
    res.json(status);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get email queue statistics
 * @route  GET /emails/queue/stats
 * @access Employee
 */
export const getQueueStats = async (req, res, next) => {
  try {
    const stats = emailQueue.getQueueStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get email connection status
 * @route  GET /emails/connection-status
 * @access Employee
 */
export const getConnectionStatus = async (req, res, next) => {
  try {
    const status = await emailService.getEmailConnectionStatus(req.user.empId);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get OAuth URL to connect Gmail
 * @route  GET /emails/connect
 * @access Employee
 */
export const getConnectUrl = async (req, res, next) => {
  try {
    const authUrl = emailService.getEmailAuthUrl(req.user.empId);
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Handle OAuth callback from Google
 * @route  GET /emails/callback
 * @access Public (redirect from Google)
 */
export const handleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/settings?email_error=invalid_callback`);
    }

    const empId = parseInt(state);
    await emailService.handleEmailAuthCallback(code, empId);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/settings?email_connected=true`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/settings?email_error=connection_failed`);
  }
};

/**
 * @desc   Disconnect Gmail account
 * @route  DELETE /emails/disconnect
 * @access Employee
 */
export const disconnectEmail = async (req, res, next) => {
  try {
    await emailService.disconnectEmail(req.user.empId);
    res.json({ message: "Gmail account disconnected successfully" });
  } catch (error) {
    next(error);
  }
};

/* ===================================================
   GMAIL INBOX/SENT/DRAFTS CONTROLLERS
=================================================== */

/**
 * @desc   Get Gmail inbox messages
 * @route  GET /emails/gmail/inbox
 * @access Employee
 */
export const getGmailInbox = async (req, res, next) => {
  try {
    const { maxResults, pageToken, q } = req.query;
    console.log(`📧 Fetching inbox for employee ${req.user.empId}`);
    
    const result = await gmailService.getInboxMessages(req.user.empId, {
      maxResults: parseInt(maxResults) || 20,
      pageToken,
      q,
    });
    
    console.log(`📧 Found ${result.messages?.length || 0} messages`);
    res.json(result);
  } catch (error) {
    console.error("❌ Gmail inbox error:", error.message, error.stack);
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Get Gmail sent messages
 * @route  GET /emails/gmail/sent
 * @access Employee
 */
export const getGmailSent = async (req, res, next) => {
  try {
    const { maxResults, pageToken } = req.query;
    const result = await gmailService.getSentMessages(req.user.empId, {
      maxResults: parseInt(maxResults) || 20,
      pageToken,
    });
    res.json(result);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Get CRM-sent emails only (emails sent via CRM with X-CRM-Sent header)
 * @route  GET /emails/gmail/crm-sent
 * @access Employee
 */
export const getGmailCRMSent = async (req, res, next) => {
  try {
    const { maxResults, pageToken } = req.query;
    const result = await gmailService.getCRMSentMessages(req.user.empId, {
      maxResults: parseInt(maxResults) || 20,
      pageToken,
    });
    res.json(result);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Get Gmail drafts
 * @route  GET /emails/gmail/drafts
 * @access Employee
 */
export const getGmailDrafts = async (req, res, next) => {
  try {
    const { maxResults, pageToken } = req.query;
    const result = await gmailService.getDrafts(req.user.empId, {
      maxResults: parseInt(maxResults) || 20,
      pageToken,
    });
    res.json(result);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Search Gmail messages
 * @route  GET /emails/gmail/search
 * @access Employee
 */
export const searchGmail = async (req, res, next) => {
  try {
    const { q, maxResults, pageToken } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const result = await gmailService.searchMessages(req.user.empId, q, {
      maxResults: parseInt(maxResults) || 20,
      pageToken,
    });
    res.json(result);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Get single Gmail message
 * @route  GET /emails/gmail/message/:messageId
 * @access Employee
 */
export const getGmailMessage = async (req, res, next) => {
  try {
    const message = await gmailService.getMessage(req.user.empId, req.params.messageId);
    res.json(message);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Mark message as read
 * @route  POST /emails/gmail/message/:messageId/read
 * @access Employee
 */
export const markMessageRead = async (req, res, next) => {
  try {
    await gmailService.modifyMessageLabels(req.user.empId, req.params.messageId, {
      removeLabels: ["UNREAD"],
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Mark message as unread
 * @route  POST /emails/gmail/message/:messageId/unread
 * @access Employee
 */
export const markMessageUnread = async (req, res, next) => {
  try {
    await gmailService.modifyMessageLabels(req.user.empId, req.params.messageId, {
      addLabels: ["UNREAD"],
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Trash a Gmail message
 * @route  DELETE /emails/gmail/message/:messageId
 * @access Employee
 */
export const trashGmailMessage = async (req, res, next) => {
  try {
    await gmailService.trashMessage(req.user.empId, req.params.messageId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single Gmail draft
 * @route  GET /emails/gmail/draft/:draftId
 * @access Employee
 */
export const getGmailDraft = async (req, res, next) => {
  try {
    const draft = await gmailService.getDraft(req.user.empId, req.params.draftId);
    res.json(draft);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Create Gmail draft
 * @route  POST /emails/gmail/drafts
 * @access Employee
 */
export const createGmailDraft = async (req, res, next) => {
  try {
    const { to, subject, body, cc, bcc } = req.body;
    const result = await gmailService.createDraft(req.user.empId, {
      to,
      subject,
      body,
      cc,
      bcc,
    });
    res.status(201).json(result);
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(403).json({
        message: "Please connect your Gmail account",
        code: "EMAIL_NOT_CONNECTED",
      });
    }
    next(error);
  }
};

/**
 * @desc   Update Gmail draft
 * @route  PUT /emails/gmail/draft/:draftId
 * @access Employee
 */
export const updateGmailDraft = async (req, res, next) => {
  try {
    const { to, subject, body, cc, bcc } = req.body;
    const result = await gmailService.updateDraft(req.user.empId, req.params.draftId, {
      to,
      subject,
      body,
      cc,
      bcc,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete Gmail draft
 * @route  DELETE /emails/gmail/draft/:draftId
 * @access Employee
 */
export const deleteGmailDraft = async (req, res, next) => {
  try {
    await gmailService.deleteDraft(req.user.empId, req.params.draftId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Send Gmail draft
 * @route  POST /emails/gmail/draft/:draftId/send
 * @access Employee
 */
export const sendGmailDraft = async (req, res, next) => {
  try {
    const result = await gmailService.sendDraft(req.user.empId, req.params.draftId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
