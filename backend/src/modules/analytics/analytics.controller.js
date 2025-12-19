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
