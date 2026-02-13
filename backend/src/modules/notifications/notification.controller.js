import * as notificationService from "./notification.service.js";

/* ---------------------------------------------------
   GET NOTIFICATIONS
   GET /api/notifications
   Query params: limit, offset, unreadOnly
--------------------------------------------------- */
export const getNotifications = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    const notifications = await notificationService.getNotifications(companyId, empId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === "true",
    });

    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   GET UNREAD COUNT
   GET /api/notifications/unread-count
--------------------------------------------------- */
export const getUnreadCount = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const count = await notificationService.getUnreadCount(companyId, empId);
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   MARK AS READ
   PUT /api/notifications/:id/read
--------------------------------------------------- */
export const markAsRead = async (req, res, next) => {
  try {
    const { empId } = req.user;
    const { id } = req.params;

    const success = await notificationService.markAsRead(parseInt(id), empId);
    
    if (!success) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   MARK ALL AS READ
   PUT /api/notifications/read-all
--------------------------------------------------- */
export const markAllAsRead = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const count = await notificationService.markAllAsRead(companyId, empId);
    res.json({ success: true, markedCount: count });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------
   ARCHIVE NOTIFICATION
   DELETE /api/notifications/:id
--------------------------------------------------- */
export const archiveNotification = async (req, res, next) => {
  try {
    const { empId } = req.user;
    const { id } = req.params;

    const success = await notificationService.archiveNotification(parseInt(id), empId);
    
    if (!success) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
