import { Router } from "express";
import * as taskController from "./task.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

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
