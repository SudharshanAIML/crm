import * as taskRepo from "./task.repo.js";
import * as gcalService from "../../services/googleCalendar.service.js";
import * as appointmentEmailService from "../../services/appointmentEmail.service.js";

/**
 * Fire-and-forget Google Calendar sync.
 * Never throws — calendar failures must not block CRM operations.
 */
const syncToCalendar = async (action, taskId, empId) => {
  try {
    switch (action) {
      case "create":
        await gcalService.createCalendarEvent(taskId, empId);
        break;
      case "update":
        await gcalService.updateCalendarEvent(taskId, empId);
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
  
  // Fire-and-forget: sync to Google Calendar
  syncToCalendar("create", task.task_id, taskData.emp_id);
  
  // Fire-and-forget: send appointment email to contact
  sendAppointmentNotification(task.task_id, taskData.emp_id);
  
  return task;
};

/* ---------------------------------------------------
   UPDATE TASK
--------------------------------------------------- */
export const updateTask = async (taskId, companyId, empId, updates) => {
  // Check if this is a significant change that warrants re-notification
  const significantFields = ['contact_id', 'due_date', 'due_time', 'title', 'task_type'];
  const hasSignificantChange = Object.keys(updates).some(key => significantFields.includes(key));
  
  const task = await taskRepo.updateTask(taskId, companyId, empId, updates);
  if (task) {
    // Fire-and-forget: sync changes to Google Calendar
    syncToCalendar("update", taskId, empId);
    
    // Fire-and-forget: send updated appointment email if significant change
    if (hasSignificantChange && updates.status !== 'CANCELLED') {
      sendAppointmentNotification(taskId, empId);
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
