import * as googleOAuth from "./googleOAuth.service.js";
import * as employeeRepo from "../modules/employees/employee.repo.js";

/**
 * Gmail Service
 * Handles full Gmail API operations: read, send, drafts, labels
 */

/* ---------------------------------------------------
   HELPER: Strip HTML tags for plain text version
--------------------------------------------------- */
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

/* ---------------------------------------------------
   HELPER: Parse message metadata
--------------------------------------------------- */
const parseMessageMetadata = (message) => {
  const headers = message.payload?.headers || [];
  const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet || "",
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    labelIds: message.labelIds || [],
    isUnread: message.labelIds?.includes("UNREAD") || false,
    isStarred: message.labelIds?.includes("STARRED") || false,
  };
};

/* ---------------------------------------------------
   HELPER: Parse full message with body
--------------------------------------------------- */
const parseFullMessage = (message) => {
  const metadata = parseMessageMetadata(message);
  
  // Extract body from payload
  let htmlBody = "";
  let textBody = "";

  const extractBody = (payload) => {
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
      if (payload.mimeType === "text/html") {
        htmlBody = decoded;
      } else if (payload.mimeType === "text/plain") {
        textBody = decoded;
      }
    }
    if (payload.parts) {
      payload.parts.forEach(extractBody);
    }
  };

  if (message.payload) {
    extractBody(message.payload);
  }

  return {
    ...metadata,
    body: htmlBody || textBody,
    bodyType: htmlBody ? "html" : "text",
  };
};

/* ---------------------------------------------------
   HELPER: Build raw RFC 2822 message
   Adds X-CRM-Sent header to identify emails sent from CRM
--------------------------------------------------- */
const buildRawMessage = ({ from, to, subject, htmlBody, textBody, cc, bcc }) => {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "X-CRM-Sent: true",
    `X-CRM-Timestamp: ${new Date().toISOString()}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="boundary"',
    "",
  ];

  if (cc) messageParts.splice(2, 0, `Cc: ${cc}`);
  if (bcc) messageParts.splice(cc ? 3 : 2, 0, `Bcc: ${bcc}`);

  messageParts.push(
    "--boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    textBody || stripHtml(htmlBody),
    "",
    "--boundary",
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlBody || "",
    "",
    "--boundary--"
  );

  const rawMessage = messageParts.join("\r\n");
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/* ---------------------------------------------------
   GET INBOX MESSAGES
   Fetches emails from user's inbox
--------------------------------------------------- */
export const getInboxMessages = async (empId, options = {}) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const { maxResults = 20, pageToken, q = "" } = options;

  // Build query - if custom query provided, use it; otherwise default to inbox
  const listParams = {
    userId: "me",
    maxResults,
    pageToken,
  };

  // Only use labelIds OR q, not both (they can conflict)
  if (q) {
    listParams.q = q;
  } else {
    listParams.labelIds = ["INBOX"];
  }

  const response = await gmail.users.messages.list(listParams);

  if (!response.data.messages) {
    return { messages: [], nextPageToken: null };
  }

  // Fetch full message details for each message
  const messages = await Promise.all(
    response.data.messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      return parseMessageMetadata(fullMessage.data);
    })
  );

  return {
    messages,
    nextPageToken: response.data.nextPageToken || null,
  };
};

/* ---------------------------------------------------
   GET SENT MESSAGES
   Fetches emails from user's sent folder
--------------------------------------------------- */
export const getSentMessages = async (empId, options = {}) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const { maxResults = 20, pageToken } = options;

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    pageToken,
    labelIds: ["SENT"],
  });

  if (!response.data.messages) {
    return { messages: [], nextPageToken: null };
  }

  const messages = await Promise.all(
    response.data.messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      return parseMessageMetadata(fullMessage.data);
    })
  );

  return {
    messages,
    nextPageToken: response.data.nextPageToken || null,
  };
};

/* ---------------------------------------------------
   GET CRM SENT MESSAGES
   Fetches only emails sent from CRM (with X-CRM-Sent header)
--------------------------------------------------- */
export const getCRMSentMessages = async (empId, options = {}) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const { maxResults = 20, pageToken } = options;

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: maxResults * 3, // Fetch more since we'll filter
    pageToken,
    labelIds: ["SENT"],
  });

  if (!response.data.messages) {
    return { messages: [], nextPageToken: null };
  }

  // Fetch full headers to check for X-CRM-Sent
  const messagesWithHeaders = await Promise.all(
    response.data.messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date", "X-CRM-Sent", "X-CRM-Timestamp"],
      });
      return fullMessage.data;
    })
  );

  // Filter for CRM-sent emails only
  const crmMessages = messagesWithHeaders
    .filter((msg) => {
      const headers = msg.payload?.headers || [];
      return headers.some(
        (h) => h.name.toLowerCase() === "x-crm-sent" && h.value === "true"
      );
    })
    .slice(0, maxResults) // Limit to requested max
    .map(parseMessageMetadata);

  return {
    messages: crmMessages,
    nextPageToken: response.data.nextPageToken || null,
  };
};

/* ---------------------------------------------------
   GET DRAFTS
   Fetches user's draft emails
--------------------------------------------------- */
export const getDrafts = async (empId, options = {}) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const { maxResults = 20, pageToken } = options;

  const response = await gmail.users.drafts.list({
    userId: "me",
    maxResults,
    pageToken,
  });

  if (!response.data.drafts) {
    return { drafts: [], nextPageToken: null };
  }

  const drafts = await Promise.all(
    response.data.drafts.map(async (draft) => {
      const fullDraft = await gmail.users.drafts.get({
        userId: "me",
        id: draft.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      return {
        draftId: draft.id,
        ...parseMessageMetadata(fullDraft.data.message),
      };
    })
  );

  return {
    drafts,
    nextPageToken: response.data.nextPageToken || null,
  };
};

/* ---------------------------------------------------
   GET SINGLE MESSAGE (FULL CONTENT)
   Fetches complete email with body
--------------------------------------------------- */
export const getMessage = async (empId, messageId) => {
  const gmail = await googleOAuth.getGmailClient(empId);

  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return parseFullMessage(response.data);
};

/* ---------------------------------------------------
   GET SINGLE DRAFT (FULL CONTENT)
--------------------------------------------------- */
export const getDraft = async (empId, draftId) => {
  const gmail = await googleOAuth.getGmailClient(empId);

  const response = await gmail.users.drafts.get({
    userId: "me",
    id: draftId,
    format: "full",
  });

  return {
    draftId: response.data.id,
    ...parseFullMessage(response.data.message),
  };
};

/* ---------------------------------------------------
   CREATE DRAFT
--------------------------------------------------- */
export const createDraft = async (empId, { to, subject, body, cc, bcc }) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const employee = await employeeRepo.getById(empId);

  const rawMessage = buildRawMessage({
    from: `"${employee.name}" <${employee.email}>`,
    to,
    subject,
    htmlBody: body,
    cc,
    bcc,
  });

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw: rawMessage },
    },
  });

  return { draftId: response.data.id };
};

/* ---------------------------------------------------
   UPDATE DRAFT
--------------------------------------------------- */
export const updateDraft = async (empId, draftId, { to, subject, body, cc, bcc }) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const employee = await employeeRepo.getById(empId);

  const rawMessage = buildRawMessage({
    from: `"${employee.name}" <${employee.email}>`,
    to,
    subject,
    htmlBody: body,
    cc,
    bcc,
  });

  const response = await gmail.users.drafts.update({
    userId: "me",
    id: draftId,
    requestBody: {
      message: { raw: rawMessage },
    },
  });

  return { draftId: response.data.id };
};

/* ---------------------------------------------------
   DELETE DRAFT
--------------------------------------------------- */
export const deleteDraft = async (empId, draftId) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  await gmail.users.drafts.delete({
    userId: "me",
    id: draftId,
  });
  return { success: true };
};

/* ---------------------------------------------------
   SEND DRAFT
--------------------------------------------------- */
export const sendDraft = async (empId, draftId) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const response = await gmail.users.drafts.send({
    userId: "me",
    requestBody: { id: draftId },
  });
  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
};

/* ---------------------------------------------------
   MARK MESSAGE AS READ/UNREAD
--------------------------------------------------- */
export const modifyMessageLabels = async (empId, messageId, { addLabels = [], removeLabels = [] }) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: addLabels,
      removeLabelIds: removeLabels,
    },
  });
  return { success: true };
};

/* ---------------------------------------------------
   TRASH MESSAGE
--------------------------------------------------- */
export const trashMessage = async (empId, messageId) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  await gmail.users.messages.trash({
    userId: "me",
    id: messageId,
  });
  return { success: true };
};

/* ---------------------------------------------------
   SEARCH MESSAGES
--------------------------------------------------- */
export const searchMessages = async (empId, query, options = {}) => {
  const gmail = await googleOAuth.getGmailClient(empId);
  const { maxResults = 20, pageToken } = options;

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    pageToken,
    q: query,
  });

  if (!response.data.messages) {
    return { messages: [], nextPageToken: null };
  }

  const messages = await Promise.all(
    response.data.messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      return parseMessageMetadata(fullMessage.data);
    })
  );

  return {
    messages,
    nextPageToken: response.data.nextPageToken || null,
  };
};

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

  const rawMessage = buildRawMessage({
    from: `"${employee.name}" <${employee.email}>`,
    to,
    subject,
    htmlBody,
    textBody,
    cc,
    bcc,
  });

  // Send email via Gmail API
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage,
    },
  });

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
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
