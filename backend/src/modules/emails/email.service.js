import crypto from "crypto";
import * as emailRepo from "./email.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";

/* ---------------------------------------------------
   SEND LEAD EMAIL (Creates tracking link)
   This is called when a new lead is created
--------------------------------------------------- */
export const sendLeadEmail = async ({ contactId, name, email, token }) => {
  // Generate tracking URL
  const trackingUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/track/${token}`;

  // Email subject and body (customize as needed)
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

  // TODO: Integrate with actual email provider (SendGrid, SES, Mailgun, etc.)
  // For now, we just log the email
  console.log(`📧 Email queued for ${email} (ID: ${emailId})`);
  console.log(`   Tracking URL: ${trackingUrl}`);

  // In production, you would call your email provider here:
  // await sendWithProvider({ to: email, subject, html: body });

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
   SEND CUSTOM EMAIL
   For employees to send custom emails to contacts
--------------------------------------------------- */
export const sendCustomEmail = async ({
  contactId,
  empId,
  subject,
  body,
  recipientEmail,
}) => {
  // Verify contact exists
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  // Generate tracking token
  const token = crypto.randomUUID();

  // Save email record
  const emailId = await emailRepo.createEmail({
    contact_id: contactId,
    emp_id: empId,
    subject,
    body,
    tracking_token: token,
  });

  // TODO: Send via email provider
  console.log(`📧 Custom email sent to ${recipientEmail || contact.email}`);

  return emailId;
};
