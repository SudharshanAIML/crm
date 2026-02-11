import * as gmailService from "./gmail.service.js";
import * as appointmentTokenService from "./appointmentToken.service.js";
import { db } from "../config/db.js";

/**
 * Appointment Email Service
 * Sends personalized appointment notification emails to contacts
 * when tasks are scheduled (CALL, MEETING, DEMO, etc.)
 */

/**
 * Format date as "Monday, February 10, 2026"
 */
const formatDate = (dateVal) => {
  const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format time as "7:00 PM"
 */
const formatTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

/**
 * Get task type display metadata
 */
const getTaskTypeInfo = (taskType) => {
  const metadata = {
    CALL: {
      emoji: "📞",
      action: "scheduled a call",
      subject: "Call Scheduled",
      color: "#10b981",
      icon: "phone",
    },
    MEETING: {
      emoji: "🤝",
      action: "scheduled a meeting",
      subject: "Meeting Invitation",
      color: "#8b5cf6",
      icon: "users",
    },
    DEMO: {
      emoji: "🎯",
      action: "scheduled a product demo",
      subject: "Product Demo Invitation",
      color: "#f59e0b",
      icon: "presentation",
    },
    EMAIL: {
      emoji: "✉️",
      action: "scheduled a follow-up",
      subject: "Follow-up Scheduled",
      color: "#3b82f6",
      icon: "mail",
    },
    FOLLOW_UP: {
      emoji: "🔔",
      action: "scheduled a follow-up",
      subject: "Follow-up Reminder",
      color: "#6366f1",
      icon: "bell",
    },
    DEADLINE: {
      emoji: "⏰",
      action: "set a deadline",
      subject: "Important Deadline",
      color: "#ef4444",
      icon: "clock",
    },
    REMINDER: {
      emoji: "📌",
      action: "set a reminder",
      subject: "Reminder Notification",
      color: "#eab308",
      icon: "bookmark",
    },
    OTHER: {
      emoji: "📋",
      action: "scheduled an appointment",
      subject: "Appointment Scheduled",
      color: "#6b7280",
      icon: "calendar",
    },
  };

  return metadata[taskType] || metadata.OTHER;
};

/**
 * Generate appointment email HTML
 */
const buildAppointmentEmailHtml = ({
  contactName,
  employeeName,
  employeeEmail,
  taskType,
  title,
  description,
  dueDate,
  dueTime,
  durationMinutes,
  isAllDay,
  priority,
  taskId,
  contactId,
}) => {
  const typeInfo = getTaskTypeInfo(taskType);
  const formattedDate = formatDate(dueDate);
  const formattedTime = dueTime ? formatTime(dueTime) : null;
  const duration = durationMinutes || 30;

  // Build time display
  let timeDisplay = "";
  if (isAllDay) {
    timeDisplay = `<strong>All Day</strong>`;
  } else if (formattedTime) {
    timeDisplay = `<strong>${formattedTime}</strong> <span style="color: #9ca3af;">(${duration} minutes)</span>`;
  } else {
    timeDisplay = `<span style="color: #6b7280;">Time not specified</span>`;
  }

  // Priority badge
  let priorityBadge = "";
  if (priority === "HIGH" || priority === "URGENT") {
    const color = priority === "URGENT" ? "#dc2626" : "#f59e0b";
    priorityBadge = `
      <div style="display: inline-block; padding: 4px 12px; background-color: ${color}15; color: ${color}; border-radius: 6px; font-size: 12px; font-weight: 600; margin-top: 10px;">
        ${priority} PRIORITY
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${typeInfo.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with gradient -->
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, ${typeInfo.color} 0%, ${typeInfo.color}dd 100%); border-radius: 16px 16px 0 0;">
                  <div style="font-size: 48px; margin-bottom: 10px;">${typeInfo.emoji}</div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">${typeInfo.subject}</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; color: #111827; font-size: 16px; line-height: 1.6;">
                    Hi <strong>${contactName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${employeeName} has ${typeInfo.action} with you:
                  </p>
                  
                  <!-- Appointment Card -->
                  <div style="background: linear-gradient(135deg, ${typeInfo.color}08 0%, ${typeInfo.color}05 100%); border-left: 4px solid ${typeInfo.color}; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                      ${title}
                    </h2>
                    
                    <!-- Date & Time -->
                    <div style="margin-bottom: 12px;">
                      <div style="color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                        📅 Date & Time
                      </div>
                      <div style="color: #111827; font-size: 15px; line-height: 1.5;">
                        ${formattedDate}<br>
                        ${timeDisplay}
                      </div>
                    </div>
                    
                    ${
                      description
                        ? `
                    <!-- Description -->
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                      <div style="color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                        📝 Details
                      </div>
                      <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${description}
                      </div>
                    </div>
                    `
                        : ""
                    }
                    
                    ${priorityBadge}
                  </div>
                  
                  <!-- Action Buttons -->
                  <div style="margin: 0 0 32px;">
                    <p style="margin: 0 0 16px; color: #111827; font-size: 14px; font-weight: 600; text-align: center;">
                      Please confirm your attendance:
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 0;">
                          <!-- Accept Button (Clickable - Minimal Text Response) -->
                          <a href="${process.env.APP_URL}/api/appointments/accept/${appointmentTokenService.generateToken(taskId, contactId, 'accept')}" 
                             style="display: inline-block; min-width: 140px; padding: 14px 24px; margin: 0 4px 8px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);">
                            ✓ Accept
                          </a>
                          
                          <!-- Reschedule Button (mailto link) -->
                          <a href="mailto:${employeeEmail}?subject=Reschedule%20Request%3A%20${encodeURIComponent(title)}&body=Hi%20${encodeURIComponent(employeeName)}%2C%0A%0AI%20would%20like%20to%20request%20a%20reschedule%20for%20our%20appointment%20on%20${encodeURIComponent(formatDate(dueDate))}.%0A%0APreferred%20alternative%20times%3A%0A-%20%0A-%20%0A-%20%0A%0AReason%20for%20rescheduling%3A%0A%0A%0AThank%20you!"
                             style="display: inline-block; min-width: 140px; padding: 14px 24px; margin: 0 4px 8px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">
                            🔄 Request Reschedule
                          </a>
                          
                          <!-- Cancel Button (mailto link) -->
                          <a href="mailto:${employeeEmail}?subject=Cancel%20Appointment%3A%20${encodeURIComponent(title)}&body=Hi%20${encodeURIComponent(employeeName)}%2C%0A%0AI%20need%20to%20cancel%20our%20appointment%20scheduled%20for%20${encodeURIComponent(formatDate(dueDate))}.%0A%0AReason%20for%20cancellation%3A%0A%0A%0AI%20apologize%20for%20any%20inconvenience.%0A%0AThank%20you!"
                             style="display: inline-block; min-width: 140px; padding: 14px 24px; margin: 0 4px 8px; background: #6b7280; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 8px rgba(107, 114, 128, 0.2);">
                            ✕ Cancel
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 12px 0 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.5;">
                      Click "Accept" to confirm your attendance • Click "Request Reschedule" or "Cancel" to send an email with your request
                    </p>
                  </div>
                  
                  <!-- What to Expect -->
                  <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 0 0 20px; border-left: 3px solid ${typeInfo.color};">
                    <p style="margin: 0 0 12px; color: #111827; font-size: 14px; font-weight: 600;">
                      📋 What to expect:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.8;">
                      <li>Click "Accept" to confirm - you'll see a confirmation message</li>
                      <li>Use "Request Reschedule" if you need a different time</li>
                      <li>Use "Cancel" if you can't make it</li>
                      <li>We'll send a reminder 15 minutes before the scheduled time</li>
                    </ul>
                  </div>
                  
                  <!-- Contact Info -->
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                    <p style="margin: 0 0 12px; color: #111827; font-size: 14px; font-weight: 600;">
                      📞 Your point of contact:
                    </p>
                    <p style="margin: 0; color: #374151; font-size: 14px;">
                      <strong>${employeeName}</strong>
                    </p>
                    <p style="margin: 12px 0 0; color: #374151; font-size: 13px; line-height: 1.6;">
                      Have questions? Simply <strong>reply to this email</strong> and ${employeeName} will get back to you promptly.
                    </p>
                  </div>
                  
                  <p style="margin: 0; color: #111827; font-size: 14px; line-height: 1.6;">
                    We look forward to connecting with you! 🎉
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                    This is an automated appointment notification sent on behalf of ${employeeName}.<br>
                    Replies to this email will be directed to ${employeeName} for prompt assistance.
                  </p>
                  <p style="margin: 12px 0 0; color: #9ca3af; font-size: 11px;">
                    📧 Need immediate help? Reply to this email • 📅 Add to your calendar to stay organized
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Build plain text version of appointment email
 */
const buildAppointmentEmailText = ({
  contactName,
  employeeName,
  taskType,
  title,
  description,
  dueDate,
  dueTime,
  durationMinutes,
  isAllDay,
  priority,
}) => {
  const typeInfo = getTaskTypeInfo(taskType);
  const formattedDate = formatDate(dueDate);
  const formattedTime = dueTime ? formatTime(dueTime) : "Time not specified";
  const duration = durationMinutes || 30;

  let text = `${typeInfo.subject}\n\n`;
  text += `Hi ${contactName},\n\n`;
  text += `${employeeName} has ${typeInfo.action} with you:\n\n`;
  text += `${title}\n`;
  text += `${"=".repeat(title.length)}\n\n`;
  text += `Date: ${formattedDate}\n`;
  text += `Time: ${isAllDay ? "All Day" : `${formattedTime} (${duration} minutes)`}\n`;

  if (description) {
    text += `\nDetails:\n${description}\n`;
  }

  if (priority === "HIGH" || priority === "URGENT") {
    text += `\n⚠️  ${priority} PRIORITY\n`;
  }

  text += `\nWhat to expect:\n`;
  text += `• You'll receive a calendar invitation shortly\n`;
  text += `• Please confirm your availability by replying to this email\n`;
  text += `• Feel free to suggest an alternative time if needed\n`;
  text += `• We'll send a reminder 15 minutes before the scheduled time\n`;
  text += `\n---\n`;
  text += `Your point of contact: ${employeeName}\n`;
  text += `Have questions or need to reschedule? Simply reply to this email and ${employeeName} will get back to you promptly.\n\n`;
  text += `We look forward to connecting with you! 🎉\n`;
  text += `\n---\n`;
  text += `This is an automated appointment notification sent on behalf of ${employeeName}.\n`;
  text += `Replies to this email will be directed to ${employeeName} for prompt assistance.\n`;

  return text;
};

/**
 * Send appointment notification email to a contact.
 * Fire-and-forget — never throws, logs warnings on failure.
 *
 * @param {number} taskId - Task ID
 * @param {number} empId - Employee ID (sender)
 */
export const sendAppointmentEmail = async (taskId, empId) => {
  try {
    // Check if employee can send emails
    const canSend = await gmailService.canSendEmail(empId);
    if (!canSend) {
      console.log(`[Appointment Email] Skipped task ${taskId} — employee ${empId} has no Gmail connection`);
      return;
    }

    // Fetch task with contact details
    const [rows] = await db.query(
      `SELECT 
        t.*,
        c.name AS contact_name,
        c.email AS contact_email,
        e.name AS employee_name,
        e.email AS employee_email
       FROM tasks t
       LEFT JOIN contacts c ON c.contact_id = t.contact_id
       LEFT JOIN employees e ON e.emp_id = t.emp_id
       WHERE t.task_id = ?`,
      [taskId]
    );

    const task = rows[0];
    if (!task) {
      console.warn(`[Appointment Email] Task ${taskId} not found`);
      return;
    }

    // Only send for tasks with contacts who have emails
    if (!task.contact_id || !task.contact_email) {
      console.log(`[Appointment Email] Skipped task ${taskId} — no contact email`);
      return;
    }

    // Only send for appointment-type tasks (not generic tasks)
    const appointmentTypes = ["CALL", "MEETING", "DEMO", "FOLLOW_UP"];
    if (!appointmentTypes.includes(task.task_type)) {
      console.log(`[Appointment Email] Skipped task ${taskId} — type ${task.task_type} is not an appointment`);
      return;
    }

    // Don't send for cancelled tasks
    if (task.status === "CANCELLED") {
      console.log(`[Appointment Email] Skipped task ${taskId} — status is CANCELLED`);
      return;
    }

    const typeInfo = getTaskTypeInfo(task.task_type);

    const htmlBody = buildAppointmentEmailHtml({
      contactName: task.contact_name,
      employeeName: task.employee_name,
      employeeEmail: task.employee_email,
      taskType: task.task_type,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      dueTime: task.due_time,
      durationMinutes: task.duration_minutes,
      isAllDay: task.is_all_day,
      priority: task.priority,
      taskId: task.task_id,
      contactId: task.contact_id,
    });

    const textBody = buildAppointmentEmailText({
      contactName: task.contact_name,
      employeeName: task.employee_name,
      taskType: task.task_type,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      dueTime: task.due_time,
      durationMinutes: task.duration_minutes,
      isAllDay: task.is_all_day,
      priority: task.priority,
    });

    // Send via Gmail API
    await gmailService.sendEmailViaGmail({
      empId,
      to: task.contact_email,
      subject: `${typeInfo.emoji} ${typeInfo.subject}: ${task.title}`,
      htmlBody,
      textBody,
      replyTo: task.employee_email,
    });

    console.log(`[Appointment Email] ✓ Sent ${task.task_type} notification for task ${taskId} to ${task.contact_email}`);
  } catch (err) {
    // Fire-and-forget: log warning but don't throw
    console.warn(`[Appointment Email] Failed to send for task ${taskId}:`, err.message);
  }
};
