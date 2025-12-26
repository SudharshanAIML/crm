import * as googleOAuth from "./googleOAuth.service.js";
import * as employeeRepo from "../modules/employees/employee.repo.js";

/**
 * Gmail Service
 * Handles sending emails via Gmail API using OAuth tokens
 */

/**
 * Send email via Gmail API
 * Uses the employee's connected Gmail account
 */
export const sendEmailViaGmail = async ({
  empId,
  to,
  subject,
  htmlBody,
  textBody,
  cc,
  bcc,
  replyTo,
}) => {
  // Get Gmail client with valid tokens
  const gmail = await googleOAuth.getGmailClient(empId);
  
  // Get employee details for 'From' field
  const employee = await employeeRepo.getById(empId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  // Build RFC 2822 formatted email
  const messageParts = [
    `From: "${employee.name}" <${employee.email}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="boundary"',
    "",
  ];

  if (cc) messageParts.splice(2, 0, `Cc: ${cc}`);
  if (bcc) messageParts.splice(cc ? 3 : 2, 0, `Bcc: ${bcc}`);
  if (replyTo) messageParts.splice(1, 0, `Reply-To: ${replyTo}`);

  // Add plain text and HTML parts
  messageParts.push(
    "--boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    textBody || stripHtml(htmlBody),
    "",
    "--boundary",
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlBody,
    "",
    "--boundary--"
  );

  const rawMessage = messageParts.join("\r\n");
  
  // Base64 URL encode the message
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send email via Gmail API
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
};

/**
 * Strip HTML tags for plain text version
 */
const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * Send email with tracking pixel
 */
export const sendTrackedEmail = async ({
  empId,
  to,
  subject,
  body,
  trackingUrl,
}) => {
  // Add tracking pixel to HTML body
  const htmlBodyWithTracking = `
    <html>
      <body>
        ${body.replace(/\n/g, "<br>")}
        <img src="${trackingUrl}?type=pixel" width="1" height="1" style="display:none" alt="" />
      </body>
    </html>
  `;

  return sendEmailViaGmail({
    empId,
    to,
    subject,
    htmlBody: htmlBodyWithTracking,
  });
};

/**
 * Check if employee can send emails
 */
export const canSendEmail = async (empId) => {
  return googleOAuth.isEmailConnected(empId);
};
