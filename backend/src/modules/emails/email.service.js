import crypto from "crypto";
import * as emailRepo from "./email.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";
import * as gmailService from "../../services/gmail.service.js";
import * as googleOAuth from "../../services/googleOAuth.service.js";
import { sendMail } from "../../config/email.js";

/* ---------------------------------------------------
   SEND LEAD EMAIL (Creates tracking link)
   This uses system email for automated lead emails
--------------------------------------------------- */
export const sendLeadEmail = async ({ contactId, name, email, token }) => {
  // Generate tracking URL
  const trackingUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/track/${token}`;

  // Email subject and body
  const subject = "Welcome! Learn more about our services";
  const body = `
    <html>
      <body>
        <h2>Hello ${name},</h2>
        <p>Thank you for your interest in our services.</p>
        <p>Click the link below to learn more:</p>
        <a href="${trackingUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        ">Learn More</a>
        <p>Best regards,<br/>The Team</p>
      </body>
    </html>
  `;

  // Save email record to database
  const emailId = await emailRepo.createEmail({
    contact_id: contactId,
    subject,
    body,
    tracking_token: token,
  });

  // Send via system email (automated emails)
  try {
    await sendMail({
      to: email,
      subject,
      html: body,
    });
    console.log(`📧 Lead email sent to ${email} (ID: ${emailId})`);
  } catch (error) {
    console.error(`❌ Failed to send lead email to ${email}:`, error.message);
  }

  return emailId;
};

/* ---------------------------------------------------
   TRACK EMAIL CLICK
   Called when lead clicks the tracking link
--------------------------------------------------- */
export const trackEmailClick = async (token) => {
  const email = await emailRepo.getByTrackingToken(token);

  if (!email) {
    throw new Error("Invalid tracking token");
  }

  // Mark email as clicked
  await emailRepo.markClicked(email.email_id);

  return {
    contactId: email.contact_id,
    emailId: email.email_id,
  };
};

/* ---------------------------------------------------
   GET EMAILS BY CONTACT
--------------------------------------------------- */
export const getEmailsByContact = async (contactId) => {
  return await emailRepo.getByContact(contactId);
};

/* ---------------------------------------------------
   SEND CUSTOM EMAIL VIA EMPLOYEE'S GMAIL
   Uses OAuth to send from employee's own account
--------------------------------------------------- */
export const sendCustomEmail = async ({
  contactId,
  empId,
  subject,
  body,
  recipientEmail,
  cc,
  bcc,
}) => {
  // Verify contact exists
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  // Check if employee has connected email
  const canSend = await gmailService.canSendEmail(empId);
  if (!canSend) {
    throw new Error("EMAIL_NOT_CONNECTED");
  }

  // Generate tracking token
  const token = crypto.randomUUID();
  const trackingUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/track/${token}`;

  // Build HTML body with tracking pixel
  const htmlBody = `
    <html>
      <body>
        ${body.replace(/\n/g, "<br>")}
        <br><br>
        <img src="${trackingUrl}?type=pixel" width="1" height="1" style="display:none" alt="" />
      </body>
    </html>
  `;

  // Save email record
  const emailId = await emailRepo.createEmail({
    contact_id: contactId,
    emp_id: empId,
    subject,
    body: htmlBody,
    tracking_token: token,
  });

  // Send via employee's Gmail
  const toEmail = recipientEmail || contact.email;
  try {
    const result = await gmailService.sendEmailViaGmail({
      empId,
      to: toEmail,
      subject,
      htmlBody,
      cc,
      bcc,
    });
    
    // Update email record with Gmail message ID
    await emailRepo.updateGmailId(emailId, result.messageId);
    
    console.log(`✅ Email sent via Gmail to ${toEmail} (ID: ${emailId})`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
    
    // If it's an auth error, provide helpful message
    if (error.message === "EMAIL_NOT_CONNECTED") {
      throw new Error("Please connect your Gmail account to send emails");
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return emailId;
};

/* ---------------------------------------------------
   CHECK EMAIL CONNECTION STATUS
--------------------------------------------------- */
export const getEmailConnectionStatus = async (empId) => {
  return {
    connected: await googleOAuth.isEmailConnected(empId),
  };
};

/* ---------------------------------------------------
   GET AUTHORIZATION URL
--------------------------------------------------- */
export const getEmailAuthUrl = (empId) => {
  return googleOAuth.getAuthUrl(empId);
};

/* ---------------------------------------------------
   HANDLE OAUTH CALLBACK
--------------------------------------------------- */
export const handleEmailAuthCallback = async (code, empId) => {
  return googleOAuth.handleAuthCallback(code, empId);
};

/* ---------------------------------------------------
   DISCONNECT EMAIL
--------------------------------------------------- */
export const disconnectEmail = async (empId) => {
  return googleOAuth.disconnectEmail(empId);
};
