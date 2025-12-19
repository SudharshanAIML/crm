import * as analyticsRepo from "./analytics.repo.js";

/* ---------------------------------------------------
   GET DASHBOARD DATA
--------------------------------------------------- */
export const getDashboardData = async (companyId) => {
  const [pipelineStats, revenueStats, conversionRates, sessionStats] =
    await Promise.all([
      analyticsRepo.getPipelineStats(companyId),
      analyticsRepo.getRevenueStats(companyId),
      analyticsRepo.getConversionRates(companyId),
      analyticsRepo.getSessionStats(companyId),
    ]);

  // Transform pipeline stats to object
  const pipeline = {};
  pipelineStats.forEach((row) => {
    pipeline[row.status] = row.count;
  });

  // Calculate conversion rates
  const rates = {
    leadToMql:
      conversionRates.totalLeads > 0
        ? ((conversionRates.mqls / conversionRates.totalLeads) * 100).toFixed(2)
        : 0,
    mqlToSql:
      conversionRates.mqls > 0
        ? ((conversionRates.sqls / conversionRates.mqls) * 100).toFixed(2)
        : 0,
    sqlToOpportunity:
      conversionRates.sqls > 0
        ? ((conversionRates.opportunities / conversionRates.sqls) * 100).toFixed(2)
        : 0,
    opportunityToCustomer:
      conversionRates.opportunities > 0
        ? ((conversionRates.customers / conversionRates.opportunities) * 100).toFixed(2)
        : 0,
    customerToEvangelist:
      conversionRates.customers > 0
        ? ((conversionRates.evangelists / conversionRates.customers) * 100).toFixed(2)
        : 0,
  };

  return {
    pipeline,
    revenue: {
      totalRevenue: revenueStats.totalRevenue || 0,
      totalDeals: revenueStats.totalDeals || 0,
      avgDealValue: revenueStats.avgDealValue || 0,
    },
    conversionRates: rates,
    sessions: sessionStats,
  };
};

/* ---------------------------------------------------
   GET EMPLOYEE PERFORMANCE
--------------------------------------------------- */
export const getEmployeePerformance = async (companyId) => {
  return await analyticsRepo.getEmployeePerformance(companyId);
};

/* ---------------------------------------------------
   GET RECENT ACTIVITIES
--------------------------------------------------- */
export const getRecentActivities = async (companyId, limit) => {
  return await analyticsRepo.getRecentActivities(companyId, limit);
};

/* ---------------------------------------------------
   GET PIPELINE FUNNEL
--------------------------------------------------- */
export const getPipelineFunnel = async (companyId) => {
  const conversionRates = await analyticsRepo.getConversionRates(companyId);

  return {
    funnel: [
      { stage: "LEAD", count: conversionRates.totalLeads },
      { stage: "MQL", count: conversionRates.mqls },
      { stage: "SQL", count: conversionRates.sqls },
      { stage: "OPPORTUNITY", count: conversionRates.opportunities },
      { stage: "CUSTOMER", count: conversionRates.customers },
      { stage: "EVANGELIST", count: conversionRates.evangelists },
    ],
  };
};
