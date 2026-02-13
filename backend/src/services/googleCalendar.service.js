import { google } from "googleapis";
import { db } from "../config/db.js";
import { getValidTokens, oauth2Client } from "./googleOAuth.service.js";

/**
 * Google Calendar Service
 * Handles two-way sync between CRM tasks and Google Calendar events.
 *
 * Architecture:
 *  - Reuses the existing OAuth2 token infrastructure (employees table).
 *  - Each CRM task maps to at most ONE Google Calendar event via
 *    `tasks.google_calendar_event_id`.
 *  - Sync is fire-and-forget: calendar failures never block CRM operations.
 *  - All mutations (create/update/delete) are idempotent so retries are safe.
 */

// ─── Task-type → Calendar event color mapping (Google Calendar colorId) ──────
const TASK_TYPE_COLORS = {
  CALL: "2",      // Sage / green
  MEETING: "3",   // Grape / purple
  EMAIL: "7",     // Peacock / blue
  DEMO: "6",      // Tangerine / orange
  FOLLOW_UP: "1", // Lavender
  DEADLINE: "11",  // Tomato / red
  REMINDER: "5",  // Banana / yellow
  OTHER: "8",     // Graphite / gray
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pad a number to 2 digits.
 */
const pad = (n) => String(n).padStart(2, "0");

/**
 * Extract 'YYYY-MM-DD' from a MySQL DATE value.
 * mysql2 returns DATE columns as JS Date objects constructed at midnight
 * in the *server's* local timezone. Using toISOString() would shift the date
 * to UTC, which can roll it back by a day for UTC+ timezones.
 * We use local-date accessors to avoid that.
 */
const toDateString = (val) => {
  if (val instanceof Date) {
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }
  return String(val).slice(0, 10);
};

/**
 * Get an authenticated Google Calendar client for an employee.
 * Returns null (not throws) when the employee has no valid tokens,
 * so callers can gracefully skip sync.
 */
const getCalendarClient = async (empId) => {
  try {
    const accessToken = await getValidTokens(empId);
    if (!accessToken) return null;

    oauth2Client.setCredentials({ access_token: accessToken });
    return google.calendar({ version: "v3", auth: oauth2Client });
  } catch (err) {
    console.warn(`[GCal] Could not create calendar client for emp ${empId}:`, err.message);
    return null;
  }
};

// In-memory cache: empId → { tz, expiresAt }
const tzCache = new Map();
const TZ_CACHE_TTL = 30 * 60_000; // 30 minutes

/**
 * Fetch the primary calendar's timezone for an employee.
 * Cached for 30 minutes to avoid repeated API calls.
 * Falls back to 'Asia/Kolkata' if the call fails.
 */
const getCalendarTimezone = async (calendar, empId) => {
  const cached = tzCache.get(empId);
  if (cached && cached.expiresAt > Date.now()) return cached.tz;

  try {
    const res = await calendar.calendars.get({ calendarId: "primary" });
    const tz = res.data.timeZone || "Asia/Kolkata";
    tzCache.set(empId, { tz, expiresAt: Date.now() + TZ_CACHE_TTL });
    return tz;
  } catch {
    return "Asia/Kolkata";
  }
};

/**
 * Build a Google Calendar event resource from a CRM task row.
 * @param {object} task   - Task row with joined contact fields
 * @param {string|null} contactEmail
 * @param {string} userTz - IANA timezone of the user's Google Calendar
 */
// Task types eligible for Google Meet conference links
const MEET_ELIGIBLE_TYPES = new Set(["MEETING", "DEMO"]);

const buildEventResource = (task, contactEmail, userTz, { withConference = false } = {}) => {
  const dueDate = toDateString(task.due_date);
  const dueTime = task.due_time; // 'HH:MM:SS' or null
  const durationMin = task.duration_minutes || 30;

  // Determine start / end
  let start, end;
  if (task.is_all_day || !dueTime) {
    start = { date: dueDate };
    end = { date: dueDate };
  } else {
    // dueTime is 'HH:MM:SS' — times stored in user-local timezone
    const hhmm = String(dueTime).substring(0, 5);
    const startDT = `${dueDate}T${hhmm}:00`;

    // Compute end time by adding duration
    const [h, m] = hhmm.split(":").map(Number);
    const totalMin = h * 60 + m + durationMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const endDT = `${dueDate}T${pad(endH)}:${pad(endM)}:00`;

    // Use the user's Google Calendar timezone — NOT UTC
    start = { dateTime: startDT, timeZone: userTz };
    end = { dateTime: endDT, timeZone: userTz };
  }

  const event = {
    summary: task.title,
    description: buildDescription(task),
    start,
    end,
    colorId: TASK_TYPE_COLORS[task.task_type] || "8",
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }] },
    status: task.status === "CANCELLED" ? "cancelled" : "confirmed",
  };

  // Add Google Meet conference link for eligible task types
  if (withConference && MEET_ELIGIBLE_TYPES.has(task.task_type)) {
    event.conferenceData = {
      createRequest: {
        requestId: `crm-meet-${task.task_id}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  // Attach the related contact as an attendee when we have an email
  if (contactEmail) {
    event.attendees = [{ email: contactEmail, responseStatus: "needsAction" }];
    // Avoid sending invitation emails automatically — CRM handles its own comms
    event.guestsCanModify = false;
  }

  return event;
};

/**
 * Build a rich description string for the calendar event.
 */
const buildDescription = (task) => {
  const parts = [`📋 CRM Task — ${task.task_type?.replace("_", " ")}`];
  if (task.priority) parts.push(`Priority: ${task.priority}`);
  if (task.contact_name) parts.push(`Contact: ${task.contact_name}`);
  if (task.contact_email) parts.push(`Email: ${task.contact_email}`);
  if (task.contact_phone) parts.push(`Phone: ${task.contact_phone}`);
  if (task.description) parts.push(`\n${task.description}`);
  parts.push(`\nStatus: ${task.status}`);
  return parts.join("\n");
};

// ─── Core CRUD ───────────────────────────────────────────────────────────────

/**
 * Create a Google Calendar event for a CRM task.
 * Stores the resulting event ID back into the tasks table.
 * Returns the event ID or null on failure / no connection.
 */
export const createCalendarEvent = async (taskId, empId, { generateMeetLink = false } = {}) => {
  const calendar = await getCalendarClient(empId);
  if (!calendar) return null;

  // Fetch full task with contact info
  const [rows] = await db.query(
    `SELECT t.*, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.task_id = ?`,
    [taskId]
  );
  const task = rows[0];
  if (!task) return null;

  try {
    const userTz = await getCalendarTimezone(calendar, empId);
    const withConference = generateMeetLink && MEET_ELIGIBLE_TYPES.has(task.task_type);
    const event = buildEventResource(task, task.contact_email, userTz, { withConference });

    const insertParams = {
      calendarId: "primary",
      resource: event,
      sendUpdates: "none", // Don't email attendees
    };

    // conferenceDataVersion=1 is required to create Google Meet links
    if (withConference) {
      insertParams.conferenceDataVersion = 1;
    }

    const res = await calendar.events.insert(insertParams);

    const eventId = res.data.id;
    const meetLink = res.data.hangoutLink || null;

    // Persist event ID and meet link
    await db.query(
      "UPDATE tasks SET google_calendar_event_id = ?, google_meet_link = ? WHERE task_id = ?",
      [eventId, meetLink, taskId]
    );

    return { eventId, meetLink };
  } catch (err) {
    console.error(`[GCal] Failed to create event for task ${taskId}:`, err.message);
    return null;
  }
};

/**
 * Update an existing Google Calendar event when a CRM task changes.
 * If the event doesn't exist yet (e.g. sync was off), creates it instead.
 */
export const updateCalendarEvent = async (taskId, empId, { generateMeetLink = false } = {}) => {
  // Fetch task + existing event ID
  const [rows] = await db.query(
    `SELECT t.*, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.task_id = ?`,
    [taskId]
  );
  const task = rows[0];
  if (!task) return null;

  const eventId = task.google_calendar_event_id;

  // No event yet — create one instead
  if (!eventId) {
    return createCalendarEvent(taskId, empId, { generateMeetLink });
  }

  const calendar = await getCalendarClient(empId);
  if (!calendar) return null;

  try {
    const userTz = await getCalendarTimezone(calendar, empId);
    const withConference = generateMeetLink && MEET_ELIGIBLE_TYPES.has(task.task_type) && !task.google_meet_link;
    const event = buildEventResource(task, task.contact_email, userTz, { withConference });

    const updateParams = {
      calendarId: "primary",
      eventId,
      resource: event,
      sendUpdates: "none",
    };

    if (withConference) {
      updateParams.conferenceDataVersion = 1;
    }

    const res = await calendar.events.update(updateParams);
    const meetLink = res.data.hangoutLink || task.google_meet_link || null;

    // Persist meet link if newly generated
    if (meetLink && meetLink !== task.google_meet_link) {
      await db.query(
        "UPDATE tasks SET google_meet_link = ? WHERE task_id = ?",
        [meetLink, taskId]
      );
    }

    return { eventId, meetLink };
  } catch (err) {
    // If event was deleted on Google side, recreate it
    if (err.code === 404 || err.code === 410) {
      await db.query("UPDATE tasks SET google_calendar_event_id = NULL, google_meet_link = NULL WHERE task_id = ?", [taskId]);
      return createCalendarEvent(taskId, empId, { generateMeetLink });
    }
    console.error(`[GCal] Failed to update event for task ${taskId}:`, err.message);
    return null;
  }
};

/**
 * Delete the Google Calendar event linked to a CRM task.
 */
export const deleteCalendarEvent = async (taskId, empId) => {
  const [rows] = await db.query(
    "SELECT google_calendar_event_id FROM tasks WHERE task_id = ?",
    [taskId]
  );
  const eventId = rows[0]?.google_calendar_event_id;
  if (!eventId) return;

  const calendar = await getCalendarClient(empId);
  if (!calendar) return;

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "none",
    });
  } catch (err) {
    // 404/410 = already deleted — that's fine
    if (err.code !== 404 && err.code !== 410) {
      console.error(`[GCal] Failed to delete event for task ${taskId}:`, err.message);
    }
  }
};

// ─── Bulk sync ───────────────────────────────────────────────────────────────

/**
 * Sync ALL pending/in-progress tasks for an employee to Google Calendar.
 * Used for initial connect or manual "Sync All" action.
 * Returns { created, updated, failed } counts.
 */
export const syncAllTasks = async (empId, companyId) => {
  const calendar = await getCalendarClient(empId);
  if (!calendar) {
    throw new Error("CALENDAR_NOT_CONNECTED");
  }

  const [tasks] = await db.query(
    `SELECT t.*, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.emp_id = ? AND t.company_id = ?
     AND t.status NOT IN ('CANCELLED')
     AND t.due_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     ORDER BY t.due_date ASC`,
    [empId, companyId]
  );

  // Fetch timezone once for the entire batch
  const userTz = await getCalendarTimezone(calendar, empId);

  let created = 0, updated = 0, failed = 0;

  // Process in batches of 5 to respect rate limits
  for (let i = 0; i < tasks.length; i += 5) {
    const batch = tasks.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (task) => {
        const event = buildEventResource(task, task.contact_email, userTz);
        if (task.google_calendar_event_id) {
          // Update existing
          try {
            await calendar.events.update({
              calendarId: "primary",
              eventId: task.google_calendar_event_id,
              resource: event,
              sendUpdates: "none",
            });
            return "updated";
          } catch (err) {
            if (err.code === 404 || err.code === 410) {
              // Event deleted on Google side, recreate
              const res = await calendar.events.insert({
                calendarId: "primary",
                resource: event,
                sendUpdates: "none",
              });
              await db.query(
                "UPDATE tasks SET google_calendar_event_id = ? WHERE task_id = ?",
                [res.data.id, task.task_id]
              );
              return "created";
            }
            throw err;
          }
        } else {
          // Create new
          const res = await calendar.events.insert({
            calendarId: "primary",
            resource: event,
            sendUpdates: "none",
          });
          await db.query(
            "UPDATE tasks SET google_calendar_event_id = ? WHERE task_id = ?",
            [res.data.id, task.task_id]
          );
          return "created";
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        r.value === "created" ? created++ : updated++;
      } else {
        failed++;
        console.error("[GCal] Bulk sync item failed:", r.reason?.message);
      }
    }
  }

  return { created, updated, failed, total: tasks.length };
};

/**
 * Check if the employee's Google account has Calendar access.
 * We attempt a lightweight list call; if it fails, Calendar is not authorized.
 */
export const checkCalendarAccess = async (empId) => {
  const calendar = await getCalendarClient(empId);
  if (!calendar) return { connected: false, reason: "no_tokens" };

  try {
    await calendar.calendarList.list({ maxResults: 1 });
    return { connected: true };
  } catch (err) {
    if (err.code === 403 || err.message?.includes("insufficient")) {
      return { connected: false, reason: "missing_scope" };
    }
    return { connected: false, reason: "auth_error" };
  }
};

/**
 * Generate a Google Meet link for an existing task.
 * If the task already has a calendar event, patches it with conference data.
 * If no event exists, creates one with conference data.
 * 
 * @param {number} taskId
 * @param {number} empId
 * @returns {{ meetLink: string, eventId: string } | null}
 */
export const generateMeetLink = async (taskId, empId) => {
  // Fetch task
  const [rows] = await db.query(
    `SELECT t.*, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.task_id = ?`,
    [taskId]
  );
  const task = rows[0];
  if (!task) return null;

  // Only MEETING and DEMO types are eligible
  if (!MEET_ELIGIBLE_TYPES.has(task.task_type)) {
    return null;
  }

  // If a meet link already exists, return it (idempotent)
  if (task.google_meet_link) {
    return { meetLink: task.google_meet_link, eventId: task.google_calendar_event_id };
  }

  const calendar = await getCalendarClient(empId);
  if (!calendar) return null;

  const eventId = task.google_calendar_event_id;

  try {
    let meetLink = null;

    if (eventId) {
      // Patch existing event with conference data
      const res = await calendar.events.patch({
        calendarId: "primary",
        eventId,
        conferenceDataVersion: 1,
        resource: {
          conferenceData: {
            createRequest: {
              requestId: `crm-meet-${taskId}-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
        sendUpdates: "none",
      });
      meetLink = res.data.hangoutLink || null;
    } else {
      // No calendar event yet — create one with conference data
      const result = await createCalendarEvent(taskId, empId, { generateMeetLink: true });
      meetLink = result?.meetLink || null;
    }

    // Persist meet link
    if (meetLink) {
      await db.query(
        "UPDATE tasks SET google_meet_link = ? WHERE task_id = ?",
        [meetLink, taskId]
      );
    }

    return { meetLink, eventId: eventId || (await db.query("SELECT google_calendar_event_id FROM tasks WHERE task_id = ?", [taskId]))?.[0]?.[0]?.google_calendar_event_id };
  } catch (err) {
    console.error(`[GCal] Failed to generate Meet link for task ${taskId}:`, err.message);
    return null;
  }
};
