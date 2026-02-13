import * as taskService from "./task.service.js";

/**
 * @desc   Get calendar tasks for date range
 * @route  GET /tasks/calendar
 * @access Employee
 */
export const getCalendarTasks = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const tasks = await taskService.getCalendarData(companyId, empId, startDate, endDate);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get today's tasks
 * @route  GET /tasks/today
 * @access Employee
 */
export const getTodaysTasks = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const tasks = await taskService.getTodaysTasks(companyId, empId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get this week's tasks
 * @route  GET /tasks/week
 * @access Employee
 */
export const getWeeksTasks = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const tasks = await taskService.getWeeksTasks(companyId, empId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get overdue tasks
 * @route  GET /tasks/overdue
 * @access Employee
 */
export const getOverdueTasks = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const tasks = await taskService.getOverdueTasks(companyId, empId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get upcoming tasks
 * @route  GET /tasks/upcoming
 * @access Employee
 */
export const getUpcomingTasks = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { limit = 10 } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const tasks = await taskService.getUpcomingTasks(companyId, empId, parseInt(limit));
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get task stats
 * @route  GET /tasks/stats
 * @access Employee
 */
export const getTaskStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const stats = await taskService.getTaskStats(companyId, empId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get task by ID
 * @route  GET /tasks/:taskId
 * @access Employee
 */
export const getTaskById = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { taskId } = req.params;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const task = await taskService.getTaskById(companyId, empId, taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Create a new task
 * @route  POST /tasks
 * @access Employee
 */
export const createTask = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { title, description, task_type, priority, due_date, due_time, duration_minutes, is_all_day, contact_id, generate_meet_link } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    if (!title || !due_date) {
      return res.status(400).json({ message: "Title and due date are required" });
    }

    const taskData = {
      company_id: companyId,
      emp_id: empId,
      contact_id,
      title,
      description,
      task_type: task_type || 'FOLLOW_UP',
      priority: priority || 'MEDIUM',
      due_date,
      due_time,
      duration_minutes,
      is_all_day,
      generate_meet_link: generate_meet_link || false,
    };

    const task = await taskService.createTask(taskData);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update a task
 * @route  PUT /tasks/:taskId
 * @access Employee
 */
export const updateTask = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { taskId } = req.params;
    const updates = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const task = await taskService.updateTask(taskId, companyId, empId, updates);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete a task
 * @route  DELETE /tasks/:taskId
 * @access Employee
 */
export const deleteTask = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { taskId } = req.params;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const deleted = await taskService.deleteTask(taskId, companyId, empId);
    
    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get tasks by contact
 * @route  GET /tasks/contact/:contactId
 * @access Employee
 */
export const getTasksByContact = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { contactId } = req.params;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const tasks = await taskService.getTasksByContact(companyId, empId, contactId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Resolve an overdue task with an outcome
 * @route  POST /tasks/:taskId/resolve
 * @access Employee
 */
export const resolveOverdueTask = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { taskId } = req.params;
    const { resolution, rating, feedback } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    if (!resolution) {
      return res.status(400).json({ message: "Resolution is required (COMPLETED, NOT_CONNECTED, or BAD_TIMING)" });
    }

    const task = await taskService.resolveOverdueTask(taskId, companyId, empId, resolution, { rating, feedback });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    if (error.message.includes('Invalid resolution') || error.message.includes('Only overdue')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * @desc   Generate Google Meet link for a task
 * @route  POST /tasks/:taskId/meet-link
 * @access Employee
 */
export const generateMeetLink = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const { taskId } = req.params;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const result = await taskService.generateMeetLink(taskId, companyId, empId);

    if (!result) {
      return res.status(400).json({ 
        message: "Could not generate Meet link. Ensure Google Calendar is connected and the task type is MEETING or DEMO." 
      });
    }

    res.json({ 
      google_meet_link: result.meetLink,
      google_calendar_event_id: result.eventId,
    });
  } catch (error) {
    next(error);
  }
};
