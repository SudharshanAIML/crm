import api from "./api";

/**
 * Task/Calendar Service - Handles all task and calendar API calls
 */

// Get calendar tasks for a date range
export const getCalendarTasks = async (startDate, endDate) => {
  const response = await api.get("/tasks/calendar", {
    params: { startDate, endDate },
  });
  return response.data;
};

// Get today's tasks
export const getTodaysTasks = async () => {
  const response = await api.get("/tasks/today");
  return response.data;
};

// Get this week's tasks
export const getWeeksTasks = async () => {
  const response = await api.get("/tasks/week");
  return response.data;
};

// Get overdue tasks
export const getOverdueTasks = async () => {
  const response = await api.get("/tasks/overdue");
  return response.data;
};

// Get upcoming tasks
export const getUpcomingTasks = async (limit = 10) => {
  const response = await api.get("/tasks/upcoming", {
    params: { limit },
  });
  return response.data;
};

// Get task stats
export const getTaskStats = async () => {
  const response = await api.get("/tasks/stats");
  return response.data;
};

// Get task by ID
export const getTaskById = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}`);
  return response.data;
};

// Create a new task
export const createTask = async (taskData) => {
  const response = await api.post("/tasks", taskData);
  return response.data;
};

// Update a task
export const updateTask = async (taskId, updates) => {
  const response = await api.put(`/tasks/${taskId}`, updates);
  return response.data;
};

// Delete a task
export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

// Get tasks by contact
export const getTasksByContact = async (contactId) => {
  const response = await api.get(`/tasks/contact/${contactId}`);
  return response.data;
};

export default {
  getCalendarTasks,
  getTodaysTasks,
  getWeeksTasks,
  getOverdueTasks,
  getUpcomingTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTasksByContact,
};
