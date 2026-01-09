import crypto from "crypto";
import * as emailRepo from "./email.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";
import * as employeeRepo from "../employees/employee.repo.js";
import * as companyRepo from "../companies/company.repo.js";
import * as gmailService from "../../services/gmail.service.js";
import * as googleOAuth from "../../services/googleOAuth.service.js";
import { sendMail } from "../../config/email.js";

/* ---------------------------------------------------
   GENERATE PROFESSIONAL EMAIL TEMPLATE
   Creates a branded, responsive HTML email
--------------------------------------------------- */
const generateLeadEmailTemplate = ({
  leadName,
  companyName,
  employeeName,
  employeeEmail,
  employeePhone,
  trackingUrl,
  landingPageUrl,
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome from ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ${companyName}
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Your Success Partner
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 22px; font-weight: 600;">
                Hello ${leadName}! 👋
              </h2>
              
              <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in <strong>${companyName}</strong>. We're excited to connect with you and explore how we can help you achieve your goals.
              </p>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                I'm <strong>${employeeName}</strong>, and I'll be your dedicated point of contact. Feel free to reach out anytime – I'm here to help!
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${trackingUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
                      Explore Our Services →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Contact Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; margin-top: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Your Point of Contact
                    </p>
                    <p style="margin: 0 0 8px; color: #1e293b; font-size: 18px; font-weight: 600;">
                      ${employeeName}
                    </p>
                    ${employeeEmail ? `
                    <p style="margin: 0 0 4px; color: #475569; font-size: 14px;">
                      📧 <a href="mailto:${employeeEmail}" style="color: #0ea5e9; text-decoration: none;">${employeeEmail}</a>
                    </p>
                    ` : ''}
                    ${employeePhone ? `
                    <p style="margin: 0; color: #475569; font-size: 14px;">
                      📱 <a href="tel:${employeePhone}" style="color: #0ea5e9; text-decoration: none;">${employeePhone}</a>
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; text-align: center;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                You received this email because you expressed interest in our services.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!-- Tracking Pixel -->
  <img src="${trackingUrl}?type=pixel" width="1" height="1" style="display:none" alt="" />
</body>
</html>
  `.trim();
};

/* ---------------------------------------------------
   SEND LEAD EMAIL (Creates tracking link)
   Sends personalized email from employee with company branding
--------------------------------------------------- */
export const sendLeadEmail = async ({ 
  contactId, 
  name, 
  email, 
  token, 
  empId, 
  companyId 
}) => {
  // Fetch employee and company details for personalization
  const [employee, company] = await Promise.all([
    empId ? employeeRepo.getById(empId) : null,
    companyId ? companyRepo.getById(companyId) : null,
  ]);

  const companyName = company?.company_name || process.env.COMPANY_NAME || 'Our Company';
  const employeeName = employee?.name || 'Our Team';
  const employeeEmail = employee?.email || null;
  const employeePhone = employee?.phone || null;

  // Generate tracking URL - redirects to landing page after tracking
  const trackingUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/track/${token}`;
  const landingPageUrl = process.env.LANDING_PAGE_URL || "https://yourcompany.com";

  // Email subject with company branding
  const subject = `Welcome to ${companyName} - Let's Connect!`;
  
  // Generate professional HTML email
  const body = generateLeadEmailTemplate({
    leadName: name,
    companyName,
    employeeName,
    employeeEmail,
    employeePhone,
    trackingUrl,
    landingPageUrl,
  });

  // Save email record to database
  const emailId = await emailRepo.createEmail({
    contact_id: contactId,
    emp_id: empId || null,
    subject,
    body,
    tracking_token: token,
  });

  // Try to send via employee's connected Gmail first, fallback to system email
  let sentViaGmail = false;
  
  if (empId) {
    try {
      const canSend = await gmailService.canSendEmail(empId);
      if (canSend) {
        const result = await gmailService.sendEmailViaGmail({
          empId,
          to: email,
          subject,
          htmlBody: body,
        });
        await emailRepo.updateGmailId(emailId, result.messageId);
        sentViaGmail = true;
        console.log(`📧 Lead email sent via Gmail (${employeeEmail}) to ${email} (ID: ${emailId})`);
      }
    } catch (gmailError) {
      console.warn(`⚠️ Gmail send failed, falling back to system email:`, gmailError.message);
    }
  }

  // Fallback to system email if Gmail not available
  if (!sentViaGmail) {
    try {
      await sendMail({
        to: email,
        subject,
        html: body,
        replyTo: employeeEmail || undefined,
      });
      console.log(`📧 Lead email sent via system to ${email} (ID: ${emailId})`);
    } catch (error) {
      console.error(`❌ Failed to send lead email to ${email}:`, error.message);
    }
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
   @param {Object} options - Email options
   @param {number} options.contactId - Contact ID
   @param {number} options.empId - Employee ID
   @param {string} options.subject - Email subject
   @param {string} options.body - Email body (HTML or plain text)
   @param {string} [options.recipientEmail] - Override recipient email
   @param {string} [options.cc] - CC recipients
   @param {string} [options.bcc] - BCC recipients
   @param {boolean} [options.isHtml=false] - Whether body is already HTML
   @param {Array} [options.attachments] - Array of {name, type, base64} objects
--------------------------------------------------- */
export const sendCustomEmail = async ({
  contactId,
  empId,
  subject,
  body,
  recipientEmail,
  cc,
  bcc,
  isHtml = false,
  attachments = [],
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
  // If body is already HTML, use it directly; otherwise convert line breaks
  const processedBody = isHtml ? body : body.replace(/\n/g, "<br>");
  const htmlBody = `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
        ${processedBody}
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
      attachments,
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
