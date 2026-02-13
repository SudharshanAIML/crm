import api from "./api";

/**
 * Notification Service
 * Handles all notification-related API calls
 */

/**
 * Get paginated notifications for the current user
 * @param {Object} options - Query options
 * @param {number} options.limit - Max notifications to return (default 20)
 * @param {number} options.offset - Pagination offset
 * @param {boolean} options.unreadOnly - Only return unread notifications
 */
export const getNotifications = async ({ limit = 20, offset = 0, unreadOnly = false } = {}) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    unreadOnly: unreadOnly.toString(),
  });
  const response = await api.get(`/notifications?${params}`);
  return response.data;
};

/**
 * Get the count of unread notifications (for badge)
 */
export const getUnreadCount = async () => {
  const response = await api.get("/notifications/unread-count");
  return response.data;
};

/**
 * Mark a single notification as read
 * @param {number} notificationId
 */
export const markAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await api.put("/notifications/read-all");
  return response.data;
};

/**
 * Archive (soft delete) a notification
 * @param {number} notificationId
 */
export const archiveNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
};
