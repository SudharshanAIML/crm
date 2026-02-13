import { Router } from "express";
import * as taskController from "./task.controller.js";
import * as calendarSyncController from "./calendarSync.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   GOOGLE CALENDAR SYNC ROUTES
   (Must be before /:taskId to avoid param conflicts)
--------------------------------------------------- */
router.get("/calendar-sync/status", authenticateEmployee, calendarSyncController.getSyncStatus);
router.post("/calendar-sync/sync-all", authenticateEmployee, calendarSyncController.syncAllTasks);
router.post("/calendar-sync/:taskId", authenticateEmployee, calendarSyncController.syncSingleTask);

/* ---------------------------------------------------
   GET CALENDAR TASKS (Date Range)
--------------------------------------------------- */
router.get("/calendar", authenticateEmployee, taskController.getCalendarTasks);

/* ---------------------------------------------------
   GET TODAY'S TASKS
--------------------------------------------------- */
router.get("/today", authenticateEmployee, taskController.getTodaysTasks);

/* ---------------------------------------------------
   GET THIS WEEK'S TASKS
--------------------------------------------------- */
router.get("/week", authenticateEmployee, taskController.getWeeksTasks);

/* ---------------------------------------------------
   GET OVERDUE TASKS
--------------------------------------------------- */
router.get("/overdue", authenticateEmployee, taskController.getOverdueTasks);

/* ---------------------------------------------------
   GET UPCOMING TASKS
--------------------------------------------------- */
router.get("/upcoming", authenticateEmployee, taskController.getUpcomingTasks);

/* ---------------------------------------------------
   GET TASK STATS
--------------------------------------------------- */
router.get("/stats", authenticateEmployee, taskController.getTaskStats);

/* ---------------------------------------------------
   GET TASKS BY CONTACT
--------------------------------------------------- */
router.get("/contact/:contactId", authenticateEmployee, taskController.getTasksByContact);

/* ---------------------------------------------------
   RESOLVE OVERDUE TASK
--------------------------------------------------- */
router.post("/:taskId/resolve", authenticateEmployee, taskController.resolveOverdueTask);

/* ---------------------------------------------------
   GENERATE GOOGLE MEET LINK
--------------------------------------------------- */
router.post("/:taskId/meet-link", authenticateEmployee, taskController.generateMeetLink);

/* ---------------------------------------------------
   GET TASK BY ID
--------------------------------------------------- */
router.get("/:taskId", authenticateEmployee, taskController.getTaskById);

/* ---------------------------------------------------
   CREATE TASK
--------------------------------------------------- */
router.post("/", authenticateEmployee, taskController.createTask);

/* ---------------------------------------------------
   UPDATE TASK
--------------------------------------------------- */
router.put("/:taskId", authenticateEmployee, taskController.updateTask);

/* ---------------------------------------------------
   DELETE TASK
--------------------------------------------------- */
router.delete("/:taskId", authenticateEmployee, taskController.deleteTask);

export default router;
