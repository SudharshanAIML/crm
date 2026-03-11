import crypto from "crypto";
import * as repo from "./abTest.repo.js";
import * as emailService from "../emails/email.service.js";
import * as gmailService from "../../services/gmail.service.js";
import { db } from "../../config/db.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

/* =====================================================
   VARIABLE INTERPOLATION
   Resolves {{contact_name}}, {{employee_name}}, etc.
===================================================== */
const interpolate = (text, vars = {}) => {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
};

const buildVars = (contact, employee) => ({
  contact_name:      contact?.name       || "",
  contact_email:     contact?.email      || "",
  contact_phone:     contact?.phone      || "",
  contact_job_title: contact?.job_title  || "",
  contact_status:    contact?.status     || "",
  company_name:      employee?.company_name || "",
  employee_name:     employee?.name      || "",
  employee_email:    employee?.email     || "",
});

const getEmployee = async (empId) => {
  const [rows] = await db.query(
    `SELECT e.emp_id, e.name, e.email, c.company_name
     FROM employees e
     JOIN companies c ON c.company_id = e.company_id
     WHERE e.emp_id = ?`,
    [empId]
  );
  return rows[0] || null;
};

/* =====================================================
   VALIDATION
===================================================== */
const validate = ({ name, subject_a, body_a, subject_b, body_b }) => {
  if (!name?.trim())       throw new Error("Test name is required");
  if (!subject_a?.trim())  throw new Error("Variant A subject is required");
  if (!body_a?.trim())     throw new Error("Variant A body is required");
  if (!subject_b?.trim())  throw new Error("Variant B subject is required");
  if (!body_b?.trim())     throw new Error("Variant B body is required");
};

/* =====================================================
   A/B TEST CRUD
===================================================== */

export const createTest = async ({ companyId, empId, name, subject_a, body_a, subject_b, body_b, split_pct }) => {
  validate({ name, subject_a, body_a, subject_b, body_b });
  const testId = await repo.createTest({
    company_id: companyId,
    created_by: empId,
    name, subject_a, body_a, subject_b, body_b,
    split_pct: Math.min(90, Math.max(10, split_pct ?? 50)),
  });
  return getTest(testId, companyId);
};

export const getTest = async (testId, companyId) => {
  const test = await repo.getTestById(testId);
  if (!test) throw new Error("A/B test not found");
  if (test.company_id !== companyId) throw new Error("Access denied");
  return test;
};

export const listTests = async (companyId, filters = {}) => {
  return repo.listTests(companyId, filters);
};

export const updateTest = async (testId, companyId, data) => {
  const test = await repo.getTestById(testId);
  if (!test) throw new Error("A/B test not found");
  if (test.company_id !== companyId) throw new Error("Access denied");
  if (test.status !== "DRAFT") throw new Error("Can only edit DRAFT tests");

  if (data.name !== undefined || data.subject_a !== undefined || data.body_a !== undefined ||
      data.subject_b !== undefined || data.body_b !== undefined) {
    validate({
      name:      data.name      ?? test.name,
      subject_a: data.subject_a ?? test.subject_a,
      body_a:    data.body_a    ?? test.body_a,
      subject_b: data.subject_b ?? test.subject_b,
      body_b:    data.body_b    ?? test.body_b,
    });
  }

  const updates = {};
  for (const k of ["name", "subject_a", "body_a", "subject_b", "body_b", "split_pct"]) {
    if (data[k] !== undefined) updates[k] = data[k];
  }
  if (updates.split_pct !== undefined) {
    updates.split_pct = Math.min(90, Math.max(10, updates.split_pct));
  }
  await repo.updateTest(testId, updates);
  return getTest(testId, companyId);
};

export const deleteTest = async (testId, companyId) => {
  const test = await repo.getTestById(testId);
  if (!test) throw new Error("A/B test not found");
  if (test.company_id !== companyId) throw new Error("Access denied");
  await repo.deleteTest(testId);
};

/* =====================================================
   SEND TEST — assign recipients, split, send emails
===================================================== */

/**
 * Fisher-Yates shuffle — in-place, O(n).
 */
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Rewrite links in HTML body so each <a href="..."> passes through our tracker.
 *   <a href="https://example.com"> → <a href="APP_URL/api/ab-track/click/TOKEN?url=encoded">
 * Skips mailto: and # links.
 */
const rewriteLinks = (html, trackingToken) => {
  return html.replace(
    /(<a\s[^>]*href=["'])([^"'#][^"']*)(['"][^>]*>)/gi,
    (match, before, url, after) => {
      if (url.startsWith("mailto:") || url.startsWith("#")) return match;
      const trackedUrl = `${APP_URL}/api/ab-track/click/${trackingToken}?url=${encodeURIComponent(url)}`;
      return `${before}${trackedUrl}${after}`;
    }
  );
};

/**
 * Build the HTML email with open-tracking pixel + link rewriting.
 */
const buildTrackedHtml = (body, trackingToken) => {
  const openPixelUrl = `${APP_URL}/api/ab-track/open/${trackingToken}`;
  const processedBody = body.replace(/\n/g, "<br>");
  const withLinks = rewriteLinks(processedBody, trackingToken);
  return `<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">
${withLinks}
<br><br><img src="${openPixelUrl}" width="1" height="1" style="display:none" alt="" />
</body></html>`;
};

/**
 * Send the A/B test to contactIds.
 * 1. Shuffle contacts
 * 2. Split based on split_pct
 * 3. Create recipient rows
 * 4. Send emails in bounded batches
 * 5. Update test status to SENT
 */
export const sendTest = async (testId, companyId, empId, contactIds) => {
  if (!Array.isArray(contactIds) || contactIds.length < 2) {
    throw new Error("Need at least 2 contacts to run an A/B test");
  }

  const test = await repo.getTestById(testId);
  if (!test) throw new Error("A/B test not found");
  if (test.company_id !== companyId) throw new Error("Access denied");
  if (test.status !== "DRAFT") throw new Error("Test has already been sent or cancelled");

  // Verify Gmail available
  const canSend = await gmailService.canSendEmail(empId);
  if (!canSend) throw new Error("EMAIL_NOT_CONNECTED");

  // Mark as SENDING early to prevent double-sends
  await repo.updateTest(testId, { status: "SENDING" });

  try {
    // Shuffle + split
    const shuffled = shuffle([...contactIds]);
    const splitIdx = Math.max(1, Math.round(shuffled.length * (test.split_pct / 100)));

    const groupA = shuffled.slice(0, splitIdx);
    const groupB = shuffled.slice(splitIdx);

    // Build recipient rows with tracking tokens
    const now = new Date();
    const recipientRows = [
      ...groupA.map((contactId) => ({
        test_id: testId,
        contact_id: contactId,
        company_id: companyId,
        variant: "A",
        tracking_token: crypto.randomUUID(),
      })),
      ...groupB.map((contactId) => ({
        test_id: testId,
        contact_id: contactId,
        company_id: companyId,
        variant: "B",
        tracking_token: crypto.randomUUID(),
      })),
    ];

    // Bulk insert recipients
    await repo.bulkInsertRecipients(recipientRows);

    // Fetch them back to get recipient_ids (includes contact_name, contact_email, contact_stage)
    const recipients = await repo.getRecipientsByTest(testId);

    // Fetch employee data once for template interpolation
    const employee = await getEmployee(empId);

    // Send in bounded batches of 5
    const BATCH_SIZE = 5;
    const sentUpdates = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (r) => {
          const rawSubject = r.variant === "A" ? test.subject_a : test.subject_b;
          const rawBody    = r.variant === "A" ? test.body_a    : test.body_b;

          // Interpolate template variables ({{contact_name}}, {{employee_name}}, etc.)
          const vars = buildVars(
            { name: r.contact_name, email: r.contact_email, status: r.contact_stage,
              phone: r.contact_phone, job_title: r.contact_job_title },
            employee
          );
          const subject = interpolate(rawSubject, vars);
          const body    = interpolate(rawBody, vars);

          const htmlBody = buildTrackedHtml(body, r.tracking_token);

          const result = await emailService.sendCustomEmail({
            contactId: r.contact_id,
            empId,
            subject,
            body: htmlBody,
            isHtml: true,
          });

          return { recipientId: r.recipient_id, emailId: result.emailId };
        })
      );

      for (const res of results) {
        if (res.status === "fulfilled") {
          sentUpdates.push({
            recipientId: res.value.recipientId,
            emailId: res.value.emailId,
            sentAt: now,
          });
        }
      }
    }

    // Mark recipients as sent
    if (sentUpdates.length) {
      await repo.markRecipientsSent(sentUpdates);
    }

    // Finalize test
    await repo.updateTest(testId, {
      status: "SENT",
      sent_at: now,
      total_a: groupA.length,
      total_b: groupB.length,
    });

    return {
      sent: sentUpdates.length,
      failed: recipients.length - sentUpdates.length,
      total_a: groupA.length,
      total_b: groupB.length,
    };
  } catch (err) {
    // Rollback status on catastrophic failure
    await repo.updateTest(testId, { status: "DRAFT" });
    throw err;
  }
};

/* =====================================================
   TRACKING — open / click / reply
===================================================== */

export const trackOpen = async (trackingToken) => {
  const recipient = await repo.getRecipientByToken(trackingToken);
  if (!recipient) return null;

  // First open only
  if (!recipient.opened) {
    await repo.updateRecipient(recipient.recipient_id, {
      opened: 1,
      opened_at: new Date(),
    });
    const counterCol = recipient.variant === "A" ? "opened_a" : "opened_b";
    await repo.incrementCounter(recipient.test_id, counterCol);
  }

  return recipient;
};

export const trackClick = async (trackingToken, url) => {
  const recipient = await repo.getRecipientByToken(trackingToken);
  if (!recipient) return null;

  // Log every click (for per-link analytics)
  await repo.logLinkClick({
    recipient_id: recipient.recipient_id,
    test_id: recipient.test_id,
    url,
  });

  // First click — update counter
  if (!recipient.clicked) {
    await repo.updateRecipient(recipient.recipient_id, {
      clicked: 1,
      clicked_at: new Date(),
    });
    const counterCol = recipient.variant === "A" ? "clicked_a" : "clicked_b";
    await repo.incrementCounter(recipient.test_id, counterCol);
  }

  // Also count as open if not already opened (clicked without loading pixel = image-blocked clients)
  if (!recipient.opened) {
    await repo.updateRecipient(recipient.recipient_id, {
      opened: 1,
      opened_at: new Date(),
    });
    const openCol = recipient.variant === "A" ? "opened_a" : "opened_b";
    await repo.incrementCounter(recipient.test_id, openCol);
  }

  return { recipient, url };
};

/* =====================================================
   REPLY DETECTION — called by scheduler
===================================================== */

export const checkReplies = async () => {
  const candidates = await repo.getRecipientsForReplyCheck();
  if (!candidates.length) return 0;

  let detected = 0;

  for (const r of candidates) {
    try {
      const unixTs = Math.floor(new Date(r.sent_at).getTime() / 1000);
      const results = await gmailService.searchMessages(
        r.emp_id,
        `from:${r.contact_email} after:${unixTs}`,
        { maxResults: 1 }
      );

      if (Array.isArray(results) && results.length > 0) {
        await repo.updateRecipient(r.recipient_id, {
          replied: 1,
          replied_at: new Date(),
        });
        const counterCol = r.variant === "A" ? "replied_a" : "replied_b";
        await repo.incrementCounter(r.test_id, counterCol);
        detected++;
      }
    } catch {
      // Gmail not connected — skip silently
    }
  }

  return detected;
};

/* =====================================================
   RESULTS / ANALYTICS
===================================================== */

export const getResults = async (testId, companyId) => {
  const test = await repo.getTestById(testId);
  if (!test) throw new Error("A/B test not found");
  if (test.company_id !== companyId) throw new Error("Access denied");

  const recipients = await repo.getRecipientsByTest(testId);
  const linkClicks = await repo.getLinkClicksByTest(testId);

  // Compute per-variant breakdown
  const a = recipients.filter((r) => r.variant === "A");
  const b = recipients.filter((r) => r.variant === "B");

  const rate = (num, den) => den > 0 ? Math.round((num / den) * 10000) / 100 : 0;

  const variantStats = (group, prefix) => {
    const sent    = group.filter((r) => r.sent_at).length;
    const opens   = group.filter((r) => r.opened).length;
    const clicks  = group.filter((r) => r.clicked).length;
    const replies = group.filter((r) => r.replied).length;
    return {
      sent,
      opens,
      clicks,
      replies,
      open_rate:  rate(opens,   sent),
      click_rate: rate(clicks,  sent),
      reply_rate: rate(replies, sent),
    };
  };

  const statsA = variantStats(a, "A");
  const statsB = variantStats(b, "B");

  // Determine winner
  // Composite score: open_rate * 0.3 + click_rate * 0.4 + reply_rate * 0.3
  const score = (s) => s.open_rate * 0.3 + s.click_rate * 0.4 + s.reply_rate * 0.3;
  const scoreA = score(statsA);
  const scoreB = score(statsB);
  let winner = null;
  if (test.status === "SENT" && (statsA.sent + statsB.sent) > 0) {
    if (scoreA > scoreB) winner = "A";
    else if (scoreB > scoreA) winner = "B";
    else winner = "TIE";
  }

  return {
    test,
    variant_a: statsA,
    variant_b: statsB,
    winner,
    recipients,
    link_clicks: linkClicks,
  };
};
