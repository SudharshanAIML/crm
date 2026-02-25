import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import * as gmailService from "../../services/gmail.service.js";
import * as employeeRepo from "../employees/employee.repo.js";
import * as companyRepo from "../companies/company.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";
import { similaritySearch } from "./outreach.rag.js";
import { db } from "../../config/db.js";
import dotenv from "dotenv";

dotenv.config();

// Store active autopilot intervals per employee
const activeAutopilots = new Map();

// Initialize Groq LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  temperature: 0.7,
  maxTokens: 4096,
});

/**
 * Email analysis prompt - determines if email needs a reply
 */
const analyzeEmailPrompt = PromptTemplate.fromTemplate(`
Analyze this email and determine if it requires a business reply.

EMAIL FROM: {senderEmail}
EMAIL SUBJECT: {subject}
EMAIL BODY:
{body}

Determine:
1. Is this a business inquiry that needs a response? (not spam, newsletters, or automated emails)
2. What is the sender's intent/question?
3. What type of response is needed?

Respond in JSON format:
{{
  "needsReply": true/false,
  "intent": "brief description of sender's intent",
  "category": "inquiry/support/feedback/meeting/other",
  "urgency": "high/medium/low"
}}

Only output the JSON, nothing else.
`);

/**
 * Reply generation prompt - generates structured email reply
 */
const generateReplyPrompt = PromptTemplate.fromTemplate(`
You are a professional sales representative. Generate a helpful, personalized reply to this email.

COMPANY CONTEXT (from company documents):
{companyContext}

ORIGINAL EMAIL:
From: {senderName} ({senderEmail})
Subject: {subject}
Body: {originalBody}

SENDER'S INTENT: {intent}

YOUR INFORMATION:
- Your Name: {employeeName}
- Your Email: {employeeEmail}
- Company: {companyName}

IMPORTANT FORMATTING RULES:
1. Start with a proper greeting: "Dear [Name]," or "Hi [Name],"
2. Write in clear, separate paragraphs
3. Each paragraph should focus on one point
4. Use blank lines between paragraphs
5. End with a professional sign-off and your name

CONTENT GUIDELINES:
1. Be professional, friendly, and helpful
2. Address the sender's specific questions or concerns
3. Reference company information when relevant
4. Keep the response concise (100-200 words)
5. Include a clear next step or call-to-action

Generate the email reply with proper paragraph structure.
`);

/**
 * Convert plain text reply to structured HTML
 */
const formatReplyAsHtml = (plainText, employeeName, employeeEmail, companyName) => {
  const paragraphs = plainText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const htmlParagraphs = paragraphs.map(p => {
    const formatted = p.replace(/\n/g, '<br>');
    return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${formatted}</p>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #333333; line-height: 1.6; margin: 0; padding: 20px;">
  <div style="max-width: 600px;">
    ${htmlParagraphs}
    
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-weight: 600; color: #333;">${employeeName}</p>
      <p style="margin: 4px 0 0 0; color: #666; font-size: 13px;">${companyName}</p>
      <p style="margin: 4px 0 0 0; color: #666; font-size: 13px;">
        <a href="mailto:${employeeEmail}" style="color: #0066cc; text-decoration: none;">${employeeEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();
};

/**
 * Analyze an email to determine if it needs a reply
 */
const analyzeEmail = async (email) => {
  try {
    const chain = RunnableSequence.from([
      analyzeEmailPrompt,
      llm,
      new StringOutputParser(),
    ]);

    const result = await chain.invoke({
      senderEmail: email.from || "unknown",
      subject: email.subject || "No Subject",
      body: email.body || email.snippet || "",
    });

    // Parse JSON response
    const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Error analyzing email:", error.message);
    return { needsReply: false, intent: "", category: "other", urgency: "low" };
  }
};

/**
 * Generate a reply for an email using RAG
 */
const generateReply = async ({ email, analysis, employee, company, companyId }) => {
  // Get relevant company context from RAG
  const relevantDocs = await similaritySearch(
    companyId,
    `${analysis.intent} ${email.subject} ${analysis.category}`,
    5
  );

  const companyContext = relevantDocs.length > 0
    ? relevantDocs.map((doc) => doc.content).join("\n\n")
    : "Use general professional approach. Be helpful and offer to provide more information.";

  const chain = RunnableSequence.from([
    generateReplyPrompt,
    llm,
    new StringOutputParser(),
  ]);

  const reply = await chain.invoke({
    companyContext,
    senderName: email.fromName || email.from?.split("@")[0] || "there",
    senderEmail: email.from || "",
    subject: email.subject || "No Subject",
    originalBody: email.body || email.snippet || "",
    intent: analysis.intent,
    employeeName: employee.name,
    employeeEmail: employee.email,
    companyName: company.company_name,
  });

  // Format as HTML
  const htmlReply = formatReplyAsHtml(
    reply.trim(),
    employee.name,
    employee.email,
    company.company_name
  );

  return htmlReply;
};

/**
 * Process inbox and auto-reply to emails
 */
const processInbox = async (empId, companyId) => {
  console.log(`🤖 [AutoPilot] Processing inbox for employee ${empId}`);

  try {
    // Check if autopilot is still active
    if (!activeAutopilots.has(empId)) {
      console.log(`🛑 [AutoPilot] Stopped for employee ${empId}`);
      return;
    }

    // Get employee and company info
    const [employee, company] = await Promise.all([
      employeeRepo.getById(empId),
      companyRepo.getById(companyId),
    ]);

    if (!employee || !company) {
      console.error(`❌ [AutoPilot] Employee or company not found`);
      return;
    }

    // Check Gmail connection
    const canSend = await gmailService.canSendEmail(empId);
    if (!canSend) {
      console.error(`❌ [AutoPilot] Gmail not connected for employee ${empId}`);
      return;
    }

    // Fetch recent unread emails
    const inbox = await gmailService.getInboxMessages(empId, {
      maxResults: 10,
      q: "is:unread",
    });

    if (!inbox.messages || inbox.messages.length === 0) {
      console.log(`📭 [AutoPilot] No unread emails for employee ${empId}`);
      return;
    }

    console.log(`📬 [AutoPilot] Found ${inbox.messages.length} unread emails`);

    // Process each email
    for (const emailSummary of inbox.messages) {
      try {
        // Get full email content
        const email = await gmailService.getMessage(empId, emailSummary.id);

        // Skip if already processed (check our log)
        const [processed] = await db.query(
          `SELECT id FROM autopilot_log WHERE emp_id = ? AND message_id = ?`,
          [empId, email.id]
        );

        if (processed.length > 0) {
          continue;
        }

        // Analyze the email
        const analysis = await analyzeEmail(email);

        // Log the analysis
        await db.query(
          `INSERT INTO autopilot_log (emp_id, message_id, sender_email, subject, needs_reply, intent, category, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [empId, email.id, email.from, email.subject, analysis.needsReply, analysis.intent, analysis.category]
        );

        if (!analysis.needsReply) {
          console.log(`⏭️ [AutoPilot] Skipping email (no reply needed): ${email.subject}`);
          continue;
        }

        console.log(`✍️ [AutoPilot] Generating reply for: ${email.subject}`);

        // Generate reply
        const replyBody = await generateReply({
          email,
          analysis,
          employee,
          company,
          companyId,
        });

        // Create and send reply
        const replySubject = email.subject?.startsWith("Re:") 
          ? email.subject 
          : `Re: ${email.subject}`;

        const draft = await gmailService.createDraft(empId, {
          to: email.from,
          subject: replySubject,
          body: replyBody,
          threadId: email.threadId,
        });

        await gmailService.sendDraft(empId, draft.draftId);

        // Mark original as read
        await gmailService.modifyMessageLabels(empId, email.id, {
          removeLabels: ["UNREAD"],
        });

        // Update log with reply sent
        await db.query(
          `UPDATE autopilot_log SET reply_sent = 1, reply_sent_at = NOW() WHERE emp_id = ? AND message_id = ?`,
          [empId, email.id]
        );

        console.log(`✅ [AutoPilot] Reply sent to: ${email.from}`);

      } catch (emailError) {
        console.error(`❌ [AutoPilot] Error processing email:`, emailError.message);
      }
    }

  } catch (error) {
    console.error(`❌ [AutoPilot] Error processing inbox:`, error.message);
  }
};

/**
 * Start autopilot for an employee
 */
export const startAutopilot = async (empId, companyId, intervalMinutes = 1) => {
  // Stop existing autopilot if any
  stopAutopilot(empId);

  console.log(`🚀 [AutoPilot] Starting for employee ${empId} (interval: ${intervalMinutes} min)`);

  // Save autopilot status to DB
  await db.query(
    `INSERT INTO autopilot_status (emp_id, company_id, is_active, interval_minutes, started_at)
     VALUES (?, ?, 1, ?, NOW())
     ON DUPLICATE KEY UPDATE is_active = 1, interval_minutes = ?, started_at = NOW()`,
    [empId, companyId, intervalMinutes, intervalMinutes]
  );

  // Run immediately
  processInbox(empId, companyId);

  // Set up interval
  const intervalMs = intervalMinutes * 60 * 1000;
  const intervalId = setInterval(() => {
    processInbox(empId, companyId);
  }, intervalMs);

  activeAutopilots.set(empId, { intervalId, companyId });

  return { success: true, message: "Autopilot started" };
};

/**
 * Stop autopilot for an employee
 */
export const stopAutopilot = async (empId) => {
  const autopilot = activeAutopilots.get(empId);

  if (autopilot) {
    clearInterval(autopilot.intervalId);
    activeAutopilots.delete(empId);
    console.log(`🛑 [AutoPilot] Stopped for employee ${empId}`);
  }

  // Update DB status
  await db.query(
    `UPDATE autopilot_status SET is_active = 0, stopped_at = NOW() WHERE emp_id = ?`,
    [empId]
  );

  return { success: true, message: "Autopilot stopped" };
};

/**
 * Get autopilot status for an employee
 */
export const getAutopilotStatus = async (empId) => {
  const [rows] = await db.query(
    `SELECT * FROM autopilot_status WHERE emp_id = ?`,
    [empId]
  );

  const isActiveInMemory = activeAutopilots.has(empId);

  if (rows.length === 0) {
    return {
      isActive: false,
      intervalMinutes: 1,
      startedAt: null,
    };
  }

  return {
    isActive: isActiveInMemory && rows[0].is_active === 1,
    intervalMinutes: rows[0].interval_minutes,
    startedAt: rows[0].started_at ? new Date(rows[0].started_at).toISOString() : null,
    stoppedAt: rows[0].stopped_at ? new Date(rows[0].stopped_at).toISOString() : null,
  };
};

/**
 * Get autopilot activity log
 */
export const getAutopilotLog = async (empId, limit = 50) => {
  const [rows] = await db.query(
    `SELECT * FROM autopilot_log WHERE emp_id = ? ORDER BY created_at DESC LIMIT ?`,
    [empId, limit]
  );

  // Serialize Date objects as ISO UTC strings for reliable frontend parsing
  return rows.map((row) => ({
    ...row,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    reply_sent_at: row.reply_sent_at ? new Date(row.reply_sent_at).toISOString() : null,
  }));
};

/**
 * Restore autopilot sessions on server restart
 */
export const restoreAutopilotSessions = async () => {
  try {
    const [activeSessions] = await db.query(
      `SELECT emp_id, company_id, interval_minutes FROM autopilot_status WHERE is_active = 1`
    );

    for (const session of activeSessions) {
      console.log(`🔄 [AutoPilot] Restoring session for employee ${session.emp_id}`);
      await startAutopilot(session.emp_id, session.company_id, session.interval_minutes);
    }

    console.log(`✅ [AutoPilot] Restored ${activeSessions.length} sessions`);
  } catch (error) {
    console.error(`❌ [AutoPilot] Error restoring sessions:`, error.message);
  }
};

export default {
  startAutopilot,
  stopAutopilot,
  getAutopilotStatus,
  getAutopilotLog,
  restoreAutopilotSessions,
};
