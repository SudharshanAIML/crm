import * as analyticsService from "./analytics.service.js";

/**
 * @desc   Get dashboard data
 * @route  GET /analytics/dashboard
 * @access Employee
 */
export const getDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getDashboardData(companyId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get employee performance
 * @route  GET /analytics/performance
 * @access Admin
 */
export const getEmployeePerformance = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getEmployeePerformance(companyId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get recent activities
 * @route  GET /analytics/activities
 * @access Employee
 */
export const getRecentActivities = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { limit = 20 } = req.query;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getRecentActivities(
      companyId,
      parseInt(limit)
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get pipeline funnel
 * @route  GET /analytics/funnel
 * @access Employee
 */
export const getPipelineFunnel = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getPipelineFunnel(companyId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all team members with performance stats (Admin only)
 * @route  GET /analytics/team-members
 * @access Admin
 */
export const getTeamMembers = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getTeamMembers(companyId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get specific employee by ID (Admin only)
 * @route  GET /analytics/employee/:empId
 * @access Admin
 */
export const getEmployeeById = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { empId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getEmployeeById(companyId, empId);

    if (!data) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get employee's recent activities/sessions (Admin only)
 * @route  GET /analytics/employee/:empId/activities
 * @access Admin
 */
export const getEmployeeActivities = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { empId } = req.params;
    const { limit = 20 } = req.query;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getEmployeeActivities(
      companyId,
      empId,
      parseInt(limit)
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get employee's assigned contacts/leads (Admin only)
 * @route  GET /analytics/employee/:empId/contacts
 * @access Admin
 */
export const getEmployeeContacts = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { empId } = req.params;
    const { status, search, page = 1, limit = 20 } = req.query;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getEmployeeContacts(
      companyId,
      empId,
      { status, search, page: parseInt(page), limit: parseInt(limit) }
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get comprehensive analytics for employee dashboard
 * @route  GET /analytics/comprehensive
 * @access Employee
 */
export const getComprehensiveAnalytics = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const empId = req.user.empId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getComprehensiveAnalytics(companyId, empId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get company-wide analytics for admin dashboard
 * @route  GET /analytics/admin
 * @access Admin
 */
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getAdminAnalytics(companyId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get product analytics
 * @route  GET /analytics/products
 * @access Employee
 */
export const getProductAnalytics = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getProductAnalytics(companyId);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get product details
 * @route  GET /analytics/products/:productName
 * @access Employee
 */
export const getProductDetails = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { productName } = req.params;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
      });
    }

    const data = await analyticsService.getProductDetails(companyId, productName);

    res.json(data);
  } catch (error) {
    next(error);
  }
};
