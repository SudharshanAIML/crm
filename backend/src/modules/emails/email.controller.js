import * as emailService from "./email.service.js";
import * as contactService from "../contacts/contact.service.js";

/**
 * @desc   Track email click (LEAD → MQL conversion trigger)
 * @route  GET /track/:token
 * @access Public (tracking pixel/link)
 */
export const trackClick = async (req, res, next) => {
  try {
    const { token } = req.params;

    const { contactId } = await emailService.trackEmailClick(token);

    // Process lead activity (handles LEAD → MQL conversion)
    await contactService.processLeadActivity({ contactId, token });

    // Redirect to landing page or thank you page
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
 */
export const sendEmail = async (req, res, next) => {
  try {
    const { contactId, subject, body, cc, bcc } = req.body;

    if (!contactId || !subject || !body) {
      return res.status(400).json({
        message: "contactId, subject, and body are required",
      });
    }

    const emailId = await emailService.sendCustomEmail({
      contactId,
      empId: req.user?.empId,
      subject,
      body,
      cc,
      bcc,
    });

    res.status(201).json({
      message: "Email sent successfully",
      emailId,
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
