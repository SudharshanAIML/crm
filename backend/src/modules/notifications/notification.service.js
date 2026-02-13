import * as notificationRepo from "./notification.repo.js";

/* ---------------------------------------------------
   GET NOTIFICATIONS
--------------------------------------------------- */
export const getNotifications = async (companyId, empId, options = {}) => {
  return await notificationRepo.getNotifications(companyId, empId, options);
};

/* ---------------------------------------------------
   GET UNREAD COUNT
--------------------------------------------------- */
export const getUnreadCount = async (companyId, empId) => {
  return await notificationRepo.getUnreadCount(companyId, empId);
};

/* ---------------------------------------------------
   MARK AS READ
--------------------------------------------------- */
export const markAsRead = async (notificationId, empId) => {
  return await notificationRepo.markAsRead(notificationId, empId);
};

/* ---------------------------------------------------
   MARK ALL AS READ
--------------------------------------------------- */
export const markAllAsRead = async (companyId, empId) => {
  return await notificationRepo.markAllAsRead(companyId, empId);
};

/* ---------------------------------------------------
   ARCHIVE NOTIFICATION
--------------------------------------------------- */
export const archiveNotification = async (notificationId, empId) => {
  return await notificationRepo.archiveNotification(notificationId, empId);
};

/* ---------------------------------------------------
   NOTIFICATION CREATION HELPERS
   Call these from other services to create notifications
--------------------------------------------------- */

export const createNotification = async (data) => {
  return await notificationRepo.createNotification(data);
};

/* Shorthand helpers for specific notification types */

export const notifyTaskAssigned = async (companyId, empId, taskId, taskTitle, contactName = null) => {
  const message = contactName 
    ? `Task "${taskTitle}" for ${contactName} has been assigned to you.`
    : `Task "${taskTitle}" has been assigned to you.`;
  
  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "TASK_ASSIGNED",
    title: "New Task Assigned",
    message,
    entity_type: "TASK",
    entity_id: taskId,
    priority: 7,
  });
};

export const notifyTaskDueSoon = async (companyId, empId, taskId, taskTitle, dueTime, contactName = null) => {
  const message = contactName
    ? `Task "${taskTitle}" for ${contactName} is due at ${dueTime}.`
    : `Task "${taskTitle}" is due at ${dueTime}.`;

  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "TASK_DUE_SOON",
    title: "Task Due Soon",
    message,
    entity_type: "TASK",
    entity_id: taskId,
    priority: 8,
  });
};

export const notifyTaskOverdue = async (companyId, empId, taskId, taskTitle, contactName = null) => {
  const message = contactName
    ? `Task "${taskTitle}" for ${contactName} is overdue!`
    : `Task "${taskTitle}" is overdue!`;

  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "TASK_OVERDUE",
    title: "Task Overdue",
    message,
    entity_type: "TASK",
    entity_id: taskId,
    priority: 9,
  });
};

export const notifyAppointmentAccepted = async (companyId, empId, contactId, contactName, sessionTitle) => {
  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "APPOINTMENT_ACCEPTED",
    title: "Appointment Accepted",
    message: `${contactName} accepted the appointment: "${sessionTitle}"`,
    entity_type: "APPOINTMENT",
    entity_id: contactId,
    priority: 7,
  });
};

export const notifyAppointmentRescheduled = async (companyId, empId, contactId, contactName, sessionTitle, proposedTime = null) => {
  let message = `${contactName} requested to reschedule: "${sessionTitle}"`;
  if (proposedTime) {
    message += ` - Proposed time: ${proposedTime}`;
  }
  
  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "APPOINTMENT_RESCHEDULE",
    title: "Reschedule Requested",
    message,
    entity_type: "APPOINTMENT",
    entity_id: contactId,
    priority: 8,
  });
};

export const notifyAppointmentCancelled = async (companyId, empId, contactId, contactName, sessionTitle, reason = null) => {
  let message = `${contactName} cancelled the appointment: "${sessionTitle}"`;
  if (reason) {
    message += ` - Reason: ${reason}`;
  }

  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "APPOINTMENT_CANCELLED",
    title: "Appointment Cancelled",
    message,
    entity_type: "APPOINTMENT",
    entity_id: contactId,
    priority: 8,
  });
};

export const notifyNewContact = async (companyId, empId, contactId, contactName, source = null) => {
  let message = `New contact created: ${contactName}`;
  if (source) {
    message += ` (Source: ${source})`;
  }

  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "NEW_CONTACT",
    title: "New Contact Added",
    message,
    entity_type: "CONTACT",
    entity_id: contactId,
    priority: 5,
  });
};

export const notifyDealWon = async (companyId, empId, dealId, dealName, amount = null) => {
  let message = `Deal won: "${dealName}"`;
  if (amount) {
    message += ` - Value: $${amount.toLocaleString()}`;
  }

  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "DEAL_WON",
    title: "Deal Won!",
    message,
    entity_type: "DEAL",
    entity_id: dealId,
    priority: 10,
  });
};

export const notifyDealLost = async (companyId, empId, dealId, dealName, reason = null) => {
  let message = `Deal lost: "${dealName}"`;
  if (reason) {
    message += ` - Reason: ${reason}`;
  }

  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "DEAL_LOST",
    title: "Deal Lost",
    message,
    entity_type: "DEAL",
    entity_id: dealId,
    priority: 6,
  });
};

export const notifySystem = async (companyId, empId, title, message, priority = 5) => {
  return await notificationRepo.createNotification({
    company_id: companyId,
    emp_id: empId,
    type: "SYSTEM",
    title,
    message,
    entity_type: "SYSTEM",
    entity_id: null,
    priority,
  });
};

/* ---------------------------------------------------
   SCHEDULED JOB: Check for due-soon tasks
   Call this from a cron job or interval
--------------------------------------------------- */
export const checkAndNotifyDueSoonTasks = async () => {
  const tasks = await notificationRepo.getTasksDueSoon(1); // Tasks due in next 1 hour
  
  for (const task of tasks) {
    await notifyTaskDueSoon(
      task.company_id,
      task.emp_id,
      task.task_id,
      task.title,
      task.due_time,
      task.contact_name
    );
  }
  
  return tasks.length;
};

/* ---------------------------------------------------
   CLEANUP OLD NOTIFICATIONS
--------------------------------------------------- */
export const cleanupOldNotifications = async () => {
  return await notificationRepo.cleanupOldNotifications();
};
