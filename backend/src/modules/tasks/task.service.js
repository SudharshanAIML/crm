import * as taskRepo from "./task.repo.js";

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
  return await taskRepo.createTask(taskData);
};

/* ---------------------------------------------------
   UPDATE TASK
--------------------------------------------------- */
export const updateTask = async (taskId, companyId, empId, updates) => {
  return await taskRepo.updateTask(taskId, companyId, empId, updates);
};

/* ---------------------------------------------------
   DELETE TASK
--------------------------------------------------- */
export const deleteTask = async (taskId, companyId, empId) => {
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
