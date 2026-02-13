import { Router } from "express";
import * as notificationController from "./notification.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authenticateEmployee);

// GET /api/notifications - Get paginated notifications
router.get("/", notificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread count for badge
router.get("/unread-count", notificationController.getUnreadCount);

// PUT /api/notifications/read-all - Mark all as read
router.put("/read-all", notificationController.markAllAsRead);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put("/:id/read", notificationController.markAsRead);

// DELETE /api/notifications/:id - Archive a notification
router.delete("/:id", notificationController.archiveNotification);

export default router;
