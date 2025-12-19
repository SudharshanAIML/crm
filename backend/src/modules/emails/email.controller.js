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
    const { contactId, subject, body } = req.body;

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
    });

    res.status(201).json({
      message: "Email sent successfully",
      emailId,
    });
  } catch (error) {
    next(error);
  }
};
