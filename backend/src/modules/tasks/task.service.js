import * as taskRepo from "./task.repo.js";
import * as gcalService from "../../services/googleCalendar.service.js";
import * as appointmentEmailService from "../../services/appointmentEmail.service.js";
import * as sessionService from "../sessions/session.service.js";

// Map task_type → session mode_of_contact
const TASK_TYPE_TO_MODE = {
  CALL: "CALL",
  EMAIL: "EMAIL",
  MEETING: "MEETING",
  DEMO: "DEMO",
  FOLLOW_UP: "CALL",
  DEADLINE: "NOTE",
  REMINDER: "NOTE",
  OTHER: "NOTE",
};

/**
 * Fire-and-forget session logging.
 * Automatically creates a session entry when a task with a contact is completed/resolved.
 * Never throws — session logging failures must not block CRM operations.
 */
const logTaskAsSession = async (task, sessionStatus, { rating: userRating = null, feedback: userFeedback = null } = {}) => {
  if (!task?.contact_id) return;
  try {
    // Use user-provided rating/feedback, fall back to sensible defaults
    const defaultRating = sessionStatus === "CONNECTED" ? 7 : sessionStatus === "BAD_TIMING" ? 4 : 2;
    const defaultFeedback = `[Auto-logged] Task: ${task.title}${sessionStatus !== "CONNECTED" ? " — " + sessionStatus.replace("_", " ").toLowerCase() : ""}`;

    await sessionService.createSession({
      contactId: task.contact_id,
      empId: task.emp_id,
      stage: task.contact_status || null,
      rating: userRating || defaultRating,
      sessionStatus,
      modeOfContact: TASK_TYPE_TO_MODE[task.task_type] || "NOTE",
      feedback: userFeedback || defaultFeedback,
    });
  } catch (err) {
    console.warn(`[Session Log] Failed for task ${task.task_id}:`, err.message);
  }
};

/**
 * Fire-and-forget Google Calendar sync.
 * Never throws — calendar failures must not block CRM operations.
 */
const syncToCalendar = async (action, taskId, empId, options = {}) => {
  try {
    switch (action) {
      case "create":
        await gcalService.createCalendarEvent(taskId, empId, options);
        break;
      case "update":
        await gcalService.updateCalendarEvent(taskId, empId, options);
        break;
      case "delete":
        await gcalService.deleteCalendarEvent(taskId, empId);
        break;
    }
  } catch (err) {
    console.warn(`[GCal Sync] ${action} failed for task ${taskId}:`, err.message);
  }
};

/**
 * Fire-and-forget appointment email notification.
 * Never throws — email failures must not block CRM operations.
 */
const sendAppointmentNotification = async (taskId, empId) => {
  try {
    await appointmentEmailService.sendAppointmentEmail(taskId, empId);
  } catch (err) {
    console.warn(`[Appointment Email] Failed for task ${taskId}:`, err.message);
  }
};

/* ---------------------------------------------------
   GET CALENDAR DATA
--------------------------------------------------- */
export const getCalendarData = async (companyId, empId, startDate, endDate) => {
  return await taskRepo.getTasksByDateRange(companyId, empId, startDate, endDate);
};

/* ---------------------------------------------------
   GET TODAY'S TASKS
--------------------------------------------------- */
export const getTodaysTasks = async (companyId, empId) => {
  return await taskRepo.getTodaysTasks(companyId, empId);
};

/* ---------------------------------------------------
   GET THIS WEEK'S TASKS
--------------------------------------------------- */
export const getWeeksTasks = async (companyId, empId) => {
  return await taskRepo.getWeeksTasks(companyId, empId);
};

/* ---------------------------------------------------
   GET OVERDUE TASKS
--------------------------------------------------- */
export const getOverdueTasks = async (companyId, empId) => {
  return await taskRepo.getOverdueTasks(companyId, empId);
};

/* ---------------------------------------------------
   GET UPCOMING TASKS
--------------------------------------------------- */
export const getUpcomingTasks = async (companyId, empId, limit) => {
  return await taskRepo.getUpcomingTasks(companyId, empId, limit);
};

/* ---------------------------------------------------
   GET TASK BY ID
--------------------------------------------------- */
export const getTaskById = async (companyId, empId, taskId) => {
  return await taskRepo.getTaskById(companyId, empId, taskId);
};

/* ---------------------------------------------------
   CREATE TASK
--------------------------------------------------- */
export const createTask = async (taskData) => {
  const task = await taskRepo.createTask(taskData);
  
  if (taskData.generate_meet_link) {
    // When generating a Meet link, await calendar sync first so the
    // appointment email includes the Meet link right away.
    try {
      await gcalService.createCalendarEvent(task.task_id, taskData.emp_id, { generateMeetLink: true });
    } catch (err) {
      console.warn(`[GCal Sync] create failed for task ${task.task_id}:`, err.message);
    }
    // Now send email (will include the meet link)
    sendAppointmentNotification(task.task_id, taskData.emp_id);
  } else {
    // Fire-and-forget: sync to Google Calendar
    syncToCalendar("create", task.task_id, taskData.emp_id);
    // Fire-and-forget: send appointment email to contact
    sendAppointmentNotification(task.task_id, taskData.emp_id);
  }
  
  return task;
};

/* ---------------------------------------------------
   UPDATE TASK
--------------------------------------------------- */
export const updateTask = async (taskId, companyId, empId, updates) => {
  // Extract session-only fields (not persisted to tasks table)
  const { session_rating, session_feedback, ...taskUpdates } = updates;
  
  // Check if this is a significant change that warrants re-notification
  const significantFields = ['contact_id', 'due_date', 'due_time', 'title', 'task_type'];
  const hasSignificantChange = Object.keys(taskUpdates).some(key => significantFields.includes(key));
  
  // Fetch the task before update to check if status is changing to COMPLETED
  const previousTask = taskUpdates.status === 'COMPLETED'
    ? await taskRepo.getTaskById(companyId, empId, taskId)
    : null;
  
  const task = await taskRepo.updateTask(taskId, companyId, empId, taskUpdates);
  if (task) {
    // Fire-and-forget: sync changes to Google Calendar
    syncToCalendar("update", taskId, empId);
    
    // Fire-and-forget: send updated appointment email if significant change
    if (hasSignificantChange && taskUpdates.status !== 'CANCELLED') {
      sendAppointmentNotification(taskId, empId);
    }
    
    // Auto-log a session when task is marked COMPLETED (only for tasks with contacts)
    if (taskUpdates.status === 'COMPLETED' && previousTask?.status !== 'COMPLETED') {
      logTaskAsSession(task, "CONNECTED", { rating: session_rating, feedback: session_feedback });
    }
  }
  return task;
};

/* ---------------------------------------------------
   DELETE TASK
--------------------------------------------------- */
export const deleteTask = async (taskId, companyId, empId) => {
  // Delete from Google Calendar BEFORE removing from DB (need the event ID)
  await syncToCalendar("delete", taskId, empId);
  return await taskRepo.deleteTask(taskId, companyId, empId);
};

/* ---------------------------------------------------
   GET TASK STATS
--------------------------------------------------- */
export const getTaskStats = async (companyId, empId) => {
  return await taskRepo.getTaskStats(companyId, empId);
};

/* ---------------------------------------------------
   GET TASKS BY CONTACT
--------------------------------------------------- */
export const getTasksByContact = async (companyId, empId, contactId) => {
  return await taskRepo.getTasksByContact(companyId, empId, contactId);
};

/* ---------------------------------------------------
   RESOLVE OVERDUE TASK
   Allows resolving an overdue task with an outcome:
   - COMPLETED → session_status = CONNECTED
   - NOT_CONNECTED → session_status = NOT_CONNECTED
   - BAD_TIMING → session_status = BAD_TIMING
--------------------------------------------------- */
export const resolveOverdueTask = async (taskId, companyId, empId, resolution, { rating = null, feedback = null } = {}) => {
  const validResolutions = ['COMPLETED', 'NOT_CONNECTED', 'BAD_TIMING'];
  if (!validResolutions.includes(resolution)) {
    throw new Error('Invalid resolution. Must be COMPLETED, NOT_CONNECTED, or BAD_TIMING');
  }
  
  const task = await taskRepo.getTaskById(companyId, empId, taskId);
  if (!task) return null;
  
  // Only overdue tasks can be resolved this way
  if (task.status !== 'OVERDUE') {
    throw new Error('Only overdue tasks can be resolved');
  }
  
  // Map resolution to task status and session status
  const sessionStatus = resolution === 'COMPLETED' ? 'CONNECTED' : resolution;
  const newTaskStatus = 'COMPLETED'; // All resolutions mark the task as done
  
  // Update task status
  const updatedTask = await taskRepo.updateTask(taskId, companyId, empId, {
    status: newTaskStatus,
  });
  
  if (updatedTask) {
    // Fire-and-forget: sync to Google Calendar
    syncToCalendar("update", taskId, empId);
    
    // Log session with the user-provided rating/feedback
    logTaskAsSession(updatedTask, sessionStatus, { rating, feedback });
  }
  
  return updatedTask;
};

/* ---------------------------------------------------
   GENERATE GOOGLE MEET LINK
--------------------------------------------------- */
export const generateMeetLink = async (taskId, companyId, empId) => {
  // Verify task ownership
  const task = await taskRepo.getTaskById(companyId, empId, taskId);
  if (!task) return null;

  const result = await gcalService.generateMeetLink(taskId, empId);
  if (!result?.meetLink) {
    return null;
  }

  // Re-send appointment email now that meet link is available
  sendAppointmentNotification(taskId, empId);

  return result;
};
