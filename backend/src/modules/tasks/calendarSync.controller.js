import * as gcalService from "../../services/googleCalendar.service.js";

/**
 * Calendar Sync Controller
 * HTTP handlers for Google Calendar integration endpoints
 */

/**
 * @desc   Check if Google Calendar is connected and accessible
 * @route  GET /tasks/calendar-sync/status
 * @access Employee
 */
export const getSyncStatus = async (req, res, next) => {
  try {
    const empId = req.user.empId;
    const status = await gcalService.checkCalendarAccess(empId);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Sync all eligible tasks to Google Calendar
 * @route  POST /tasks/calendar-sync/sync-all
 * @access Employee
 */
export const syncAllTasks = async (req, res, next) => {
  try {
    const empId = req.user.empId;
    const companyId = req.user.companyId;

    const result = await gcalService.syncAllTasks(empId, companyId);
    res.json({
      message: "Calendar sync completed",
      ...result,
    });
  } catch (error) {
    if (error.message === "CALENDAR_NOT_CONNECTED") {
      return res.status(400).json({
        message: "Google Calendar is not connected. Please connect your Gmail account first.",
        reason: "not_connected",
      });
    }
    next(error);
  }
};

/**
 * @desc   Manually sync a single task to Google Calendar
 * @route  POST /tasks/calendar-sync/:taskId
 * @access Employee
 */
export const syncSingleTask = async (req, res, next) => {
  try {
    const empId = req.user.empId;
    const { taskId } = req.params;

    const eventId = await gcalService.createCalendarEvent(parseInt(taskId), empId);

    if (!eventId) {
      return res.status(400).json({
        message: "Could not sync task. Ensure Google Calendar is connected.",
      });
    }

    res.json({
      message: "Task synced to Google Calendar",
      eventId,
    });
  } catch (error) {
    next(error);
  }
};
