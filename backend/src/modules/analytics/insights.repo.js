import { db } from "../../config/db.js";

/**
 * Enhanced Analytics Repository
 * Provides deep insights for business performance, customer analysis, and deal tracking
 */

/* ---------------------------------------------------
   HELPER: Build date filter clause
--------------------------------------------------- */
const buildDateFilter = (dateRange, dateColumn = 'created_at') => {
  if (!dateRange) return { clause: '', params: [] };
  
  const { startDate, endDate, preset } = dateRange;
  
  // Handle presets
  if (preset) {
    switch (preset) {
      case 'today':
        return { clause: `AND DATE(${dateColumn}) = CURDATE()`, params: [] };
      case 'yesterday':
        return { clause: `AND DATE(${dateColumn}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`, params: [] };
      case 'last7days':
        return { clause: `AND ${dateColumn} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, params: [] };
      case 'last30days':
        return { clause: `AND ${dateColumn} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, params: [] };
      case 'last90days':
        return { clause: `AND ${dateColumn} >= DATE_SUB(NOW(), INTERVAL 90 DAY)`, params: [] };
      case 'thisMonth':
        return { clause: `AND YEAR(${dateColumn}) = YEAR(CURDATE()) AND MONTH(${dateColumn}) = MONTH(CURDATE())`, params: [] };
      case 'lastMonth':
        return { clause: `AND YEAR(${dateColumn}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(${dateColumn}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`, params: [] };
      case 'thisQuarter':
        return { clause: `AND YEAR(${dateColumn}) = YEAR(CURDATE()) AND QUARTER(${dateColumn}) = QUARTER(CURDATE())`, params: [] };
      case 'thisYear':
        return { clause: `AND YEAR(${dateColumn}) = YEAR(CURDATE())`, params: [] };
      default:
        return { clause: '', params: [] };
    }
  }
  
  // Handle custom date range
  if (startDate && endDate) {
    return { clause: `AND ${dateColumn} BETWEEN ? AND ?`, params: [startDate, endDate] };
  }
  if (startDate) {
    return { clause: `AND ${dateColumn} >= ?`, params: [startDate] };
  }
  if (endDate) {
    return { clause: `AND ${dateColumn} <= ?`, params: [endDate] };
  }
  
  return { clause: '', params: [] };
};

/* ---------------------------------------------------
   HELPER: Calculate drop-off rates from stage transitions
--------------------------------------------------- */
const calculateDropOffRates = (transitions) => {
  // Define the expected pipeline flow
  const pipelineStages = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER'];
  const results = [];
  
  // Group transitions by fromStage
  const transitionsByFrom = {};
  transitions.forEach(t => {
    if (!transitionsByFrom[t.fromStage]) {
      transitionsByFrom[t.fromStage] = { total: 0, byTo: {} };
    }
    transitionsByFrom[t.fromStage].total += t.transitions;
    transitionsByFrom[t.fromStage].byTo[t.toStage] = t.transitions;
  });
  
  // Calculate drop-off for each stage transition in the pipeline
  for (let i = 0; i < pipelineStages.length - 1; i++) {
    const fromStage = pipelineStages[i];
    const toStage = pipelineStages[i + 1];
    
    const fromData = transitionsByFrom[fromStage];
    if (!fromData) continue;
    
    const progressedToNext = fromData.byTo[toStage] || 0;
    const total = fromData.total;
    
    if (total > 0) {
      const progressRate = (progressedToNext / total) * 100;
      const dropOffRate = 100 - progressRate;
      
      results.push({
        fromStage,
        toStage,
        transitions: progressedToNext,
        totalFromStage: total,
        dropOffRate: Math.round(dropOffRate),
      });
    }
  }
  
  return results;
};

/* ===================================================
   1. BUSINESS PERFORMANCE INSIGHTS
   "How is the business performing?"
=================================================== */

/**
 * Get comprehensive business performance metrics
 */
export const getBusinessPerformance = async (companyId, empId, filters = {}) => {
  const { dateRange, source, assignedTo } = filters;
  const dateFilterContacts = buildDateFilter(dateRange, 'c.created_at');
  const dateFilterDeals = buildDateFilter(dateRange, 'd.closed_at');
  const dateFilterOpportunities = buildDateFilter(dateRange, 'o.created_at');
  const isAdmin = !empId;
  
  // Base employee filter
  const empFilter = isAdmin ? '' : 'AND c.assigned_emp_id = ?';
  const empParams = isAdmin ? [] : [empId];
  
  // Source filter
  const sourceFilter = source ? 'AND c.source = ?' : '';
  const sourceParams = source ? [source] : [];
  
  // Assigned employee filter (admin only)
  const assignedFilter = assignedTo && isAdmin ? 'AND c.assigned_emp_id = ?' : '';
  const assignedParams = assignedTo && isAdmin ? [assignedTo] : [];

  // 1. Revenue metrics
  const [revenueMetrics] = await db.query(
    `SELECT 
       COUNT(d.deal_id) as totalDeals,
       COALESCE(SUM(d.deal_value), 0) as totalRevenue,
       COALESCE(AVG(d.deal_value), 0) as avgDealSize,
       COALESCE(MAX(d.deal_value), 0) as largestDeal,
       COALESCE(MIN(d.deal_value), 0) as smallestDeal
     FROM deals d
     JOIN opportunities o ON o.opportunity_id = d.opportunity_id
     JOIN contacts c ON c.contact_id = o.contact_id
     WHERE c.company_id = ? ${empFilter} ${sourceFilter} ${assignedFilter} ${dateFilterDeals.clause}`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams, ...dateFilterDeals.params]
  );

  // 2. Pipeline value (open opportunities)
  const [pipelineValue] = await db.query(
    `SELECT 
       COUNT(*) as openOpportunities,
       COALESCE(SUM(o.expected_value), 0) as pipelineValue,
       COALESCE(SUM(o.expected_value * o.probability / 100), 0) as weightedPipeline
     FROM opportunities o
     JOIN contacts c ON c.contact_id = o.contact_id
     WHERE c.company_id = ? AND o.status = 'OPEN' ${empFilter} ${sourceFilter} ${assignedFilter}`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams]
  );

  // 3. Conversion metrics
  const [conversionMetrics] = await db.query(
    `SELECT 
       COUNT(*) as totalLeads,
       SUM(CASE WHEN status = 'LEAD' THEN 1 ELSE 0 END) as leads,
       SUM(CASE WHEN status = 'MQL' THEN 1 ELSE 0 END) as mqls,
       SUM(CASE WHEN status = 'SQL' THEN 1 ELSE 0 END) as sqls,
       SUM(CASE WHEN status = 'OPPORTUNITY' THEN 1 ELSE 0 END) as opportunities,
       SUM(CASE WHEN status IN ('CUSTOMER', 'EVANGELIST') THEN 1 ELSE 0 END) as customers,
       SUM(CASE WHEN status = 'DORMANT' THEN 1 ELSE 0 END) as dormant
     FROM contacts c
     WHERE c.company_id = ? ${empFilter} ${sourceFilter} ${assignedFilter} ${dateFilterContacts.clause}`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams, ...dateFilterContacts.params]
  );

  // 4. Win/Loss rate
  const [winLossRate] = await db.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN o.status = 'WON' THEN 1 ELSE 0 END) as won,
       SUM(CASE WHEN o.status = 'LOST' THEN 1 ELSE 0 END) as lost
     FROM opportunities o
     JOIN contacts c ON c.contact_id = o.contact_id
     WHERE c.company_id = ? AND o.status != 'OPEN' ${empFilter} ${sourceFilter} ${assignedFilter} ${dateFilterOpportunities.clause}`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams, ...dateFilterOpportunities.params]
  );

  // 5. Velocity metrics (avg time through stages)
  const [velocityMetrics] = await db.query(
    `SELECT 
       AVG(CASE WHEN csh.new_status = 'MQL' THEN DATEDIFF(csh.changed_at, c.created_at) END) as avgDaysToMQL,
       AVG(CASE WHEN csh.new_status = 'SQL' THEN DATEDIFF(csh.changed_at, c.created_at) END) as avgDaysToSQL,
       AVG(CASE WHEN csh.new_status = 'CUSTOMER' THEN DATEDIFF(csh.changed_at, c.created_at) END) as avgDaysToCustomer
     FROM contact_status_history csh
     JOIN contacts c ON c.contact_id = csh.contact_id
     WHERE c.company_id = ? ${empFilter} ${sourceFilter} ${assignedFilter}`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams]
  );

  // 6. Period comparison (current vs previous period)
  const [currentPeriod] = await db.query(
    `SELECT 
       COUNT(d.deal_id) as deals,
       COALESCE(SUM(d.deal_value), 0) as revenue,
       COUNT(DISTINCT c.contact_id) as newLeads
     FROM contacts c
     LEFT JOIN opportunities o ON o.contact_id = c.contact_id
     LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id
     WHERE c.company_id = ? ${empFilter}
     AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [companyId, ...empParams]
  );

  const [previousPeriod] = await db.query(
    `SELECT 
       COUNT(d.deal_id) as deals,
       COALESCE(SUM(d.deal_value), 0) as revenue,
       COUNT(DISTINCT c.contact_id) as newLeads
     FROM contacts c
     LEFT JOIN opportunities o ON o.contact_id = c.contact_id
     LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id
     WHERE c.company_id = ? ${empFilter}
     AND c.created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
     AND c.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [companyId, ...empParams]
  );

  // Calculate trends
  const revenueTrend = previousPeriod[0].revenue > 0 
    ? ((currentPeriod[0].revenue - previousPeriod[0].revenue) / previousPeriod[0].revenue * 100).toFixed(1)
    : currentPeriod[0].revenue > 0 ? 100 : 0;
  
  const leadsTrend = previousPeriod[0].newLeads > 0
    ? ((currentPeriod[0].newLeads - previousPeriod[0].newLeads) / previousPeriod[0].newLeads * 100).toFixed(1)
    : currentPeriod[0].newLeads > 0 ? 100 : 0;

  return {
    revenue: {
      totalRevenue: parseFloat(revenueMetrics[0].totalRevenue) || 0,
      deals: revenueMetrics[0].totalDeals || 0,
      avgDealSize: parseFloat(revenueMetrics[0].avgDealSize) || 0,
      largestDeal: parseFloat(revenueMetrics[0].largestDeal) || 0,
      revenueGrowth: parseFloat(revenueTrend),
    },
    pipeline: {
      totalPipelineValue: parseFloat(pipelineValue[0].pipelineValue) || 0,
      weighted: parseFloat(pipelineValue[0].weightedPipeline) || 0,
      activeOpportunities: pipelineValue[0].openOpportunities || 0,
    },
    conversion: {
      total: conversionMetrics[0].totalLeads || 0,
      byStage: {
        lead: conversionMetrics[0].leads || 0,
        mql: conversionMetrics[0].mqls || 0,
        sql: conversionMetrics[0].sqls || 0,
        opportunity: conversionMetrics[0].opportunities || 0,
        customer: conversionMetrics[0].customers || 0,
        dormant: conversionMetrics[0].dormant || 0,
      },
      leadToCustomerRate: conversionMetrics[0].totalLeads > 0 
        ? ((conversionMetrics[0].customers / conversionMetrics[0].totalLeads) * 100).toFixed(1)
        : 0,
      rateChange: parseFloat(leadsTrend),
    },
    winLoss: {
      won: winLossRate[0].won || 0,
      lost: winLossRate[0].lost || 0,
      pending: pipelineValue[0].openOpportunities || 0,
      pendingValue: parseFloat(pipelineValue[0].pipelineValue) || 0,
      winRate: winLossRate[0].total > 0 
        ? ((winLossRate[0].won / winLossRate[0].total) * 100).toFixed(1)
        : 0,
      lossRate: winLossRate[0].total > 0
        ? ((winLossRate[0].lost / winLossRate[0].total) * 100).toFixed(1)
        : 0,
    },
    velocity: {
      avgDaysToMQL: Math.round(velocityMetrics[0].avgDaysToMQL || 0),
      avgDaysToSQL: Math.round(velocityMetrics[0].avgDaysToSQL || 0),
      avgDaysToClose: Math.round(velocityMetrics[0].avgDaysToCustomer || 0),
    },
  };
};

/* ===================================================
   2. BEST CUSTOMERS ANALYSIS
   "Who are our best customers?"
=================================================== */

/**
 * Get top customers by value
 */
export const getTopCustomers = async (companyId, empId, filters = {}) => {
  const { limit = 10, sortBy = 'revenue', dateRange } = filters;
  const dateFilter = buildDateFilter(dateRange, 'd.closed_at');
  const isAdmin = !empId;
  
  const empFilter = isAdmin ? '' : 'AND c.assigned_emp_id = ?';
  const empParams = isAdmin ? [] : [empId];

  const orderBy = sortBy === 'deals' ? 'totalDeals DESC' : 'totalRevenue DESC';

  const [customers] = await db.query(
    `SELECT 
       c.contact_id,
       c.name,
       c.email,
       c.source,
       c.status,
       c.created_at as customerSince,
       COUNT(d.deal_id) as totalDeals,
       COALESCE(SUM(d.deal_value), 0) as totalRevenue,
       COALESCE(AVG(d.deal_value), 0) as avgDealValue,
       COALESCE(MAX(d.closed_at), c.updated_at) as lastActivity,
       e.name as assignedTo
     FROM contacts c
     LEFT JOIN opportunities o ON o.contact_id = c.contact_id
     LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id ${dateFilter.clause ? dateFilter.clause.replace('AND', 'AND d.deal_id IS NOT NULL AND') : ''}
     LEFT JOIN employees e ON e.emp_id = c.assigned_emp_id
     WHERE c.company_id = ? AND c.status IN ('CUSTOMER', 'EVANGELIST') ${empFilter}
     GROUP BY c.contact_id, c.name, c.email, c.source, c.status, c.created_at, c.updated_at, e.name
     HAVING totalDeals > 0
     ORDER BY ${orderBy}
     LIMIT ?`,
    [companyId, ...empParams, ...dateFilter.params, limit]
  );

  // Get customer segments
  const [segments] = await db.query(
    `SELECT 
       CASE 
         WHEN total_value >= 50000 THEN 'Enterprise'
         WHEN total_value >= 10000 THEN 'Mid-Market'
         WHEN total_value >= 1000 THEN 'SMB'
         ELSE 'Starter'
       END as segment,
       COUNT(*) as count,
       SUM(total_value) as revenue
     FROM (
       SELECT c.contact_id, COALESCE(SUM(d.deal_value), 0) as total_value
       FROM contacts c
       LEFT JOIN opportunities o ON o.contact_id = c.contact_id
       LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id
       WHERE c.company_id = ? AND c.status IN ('CUSTOMER', 'EVANGELIST') ${empFilter}
       GROUP BY c.contact_id
     ) as customer_values
     GROUP BY segment
     ORDER BY revenue DESC`,
    [companyId, ...empParams]
  );

  // Get repeat customers (multiple deals)
  const [repeatCustomers] = await db.query(
    `SELECT 
       COUNT(*) as count,
       COALESCE(SUM(deal_count), 0) as totalDeals,
       COALESCE(SUM(total_revenue), 0) as totalRevenue
     FROM (
       SELECT c.contact_id, COUNT(d.deal_id) as deal_count, SUM(d.deal_value) as total_revenue
       FROM contacts c
       JOIN opportunities o ON o.contact_id = c.contact_id
       JOIN deals d ON d.opportunity_id = o.opportunity_id
       WHERE c.company_id = ? ${empFilter}
       GROUP BY c.contact_id
       HAVING deal_count > 1
     ) as repeat_customers`,
    [companyId, ...empParams]
  );

  return {
    topCustomers: customers,
    segments,
    repeatCustomers: {
      count: repeatCustomers[0].count || 0,
      totalDeals: repeatCustomers[0].totalDeals || 0,
      totalRevenue: parseFloat(repeatCustomers[0].totalRevenue) || 0,
    },
  };
};

/* ===================================================
   3. DEAL BOTTLENECK ANALYSIS
   "Where are deals getting stuck or lost?"
=================================================== */

/**
 * Analyze where deals are getting stuck or lost
 */
export const getDealBottlenecks = async (companyId, empId, filters = {}) => {
  const { dateRange } = filters;
  const dateFilterOpportunities = buildDateFilter(dateRange, 'o.updated_at');
  const dateFilterHistory = buildDateFilter(dateRange, 'csh.changed_at');
  const isAdmin = !empId;
  
  const empFilter = isAdmin ? '' : 'AND c.assigned_emp_id = ?';
  const empParams = isAdmin ? [] : [empId];

  // 1. Stage stagnation analysis
  const [stageStagnation] = await db.query(
    `SELECT 
       c.status as stage,
       COUNT(*) as count,
       AVG(DATEDIFF(NOW(), COALESCE(
         (SELECT MAX(csh.changed_at) FROM contact_status_history csh WHERE csh.contact_id = c.contact_id),
         c.created_at
       ))) as avgDaysInStage,
       MAX(DATEDIFF(NOW(), COALESCE(
         (SELECT MAX(csh.changed_at) FROM contact_status_history csh WHERE csh.contact_id = c.contact_id),
         c.created_at
       ))) as maxDaysInStage
     FROM contacts c
     WHERE c.company_id = ? AND c.status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT') ${empFilter}
     GROUP BY c.status
     ORDER BY FIELD(c.status, 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY')`,
    [companyId, ...empParams]
  );

  // 2. Stuck contacts (in stage > 14 days)
  const [stuckContacts] = await db.query(
    `SELECT 
       c.contact_id,
       c.name,
       c.email,
       c.status,
       c.temperature,
       DATEDIFF(NOW(), COALESCE(
         (SELECT MAX(csh.changed_at) FROM contact_status_history csh WHERE csh.contact_id = c.contact_id),
         c.created_at
       )) as daysInStage,
       (SELECT MAX(s.created_at) FROM sessions s WHERE s.contact_id = c.contact_id) as lastContact,
       e.name as assignedTo
     FROM contacts c
     LEFT JOIN employees e ON e.emp_id = c.assigned_emp_id
     WHERE c.company_id = ? AND c.status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT') ${empFilter}
     HAVING daysInStage > 14
     ORDER BY daysInStage DESC
     LIMIT 20`,
    [companyId, ...empParams]
  );

  // 3. Lost opportunity analysis
  const [lostReasons] = await db.query(
    `SELECT 
       COALESCE(o.reason, 'No reason specified') as reason,
       COUNT(*) as count,
       COALESCE(SUM(o.expected_value), 0) as lostValue
     FROM opportunities o
     JOIN contacts c ON c.contact_id = o.contact_id
     WHERE c.company_id = ? AND o.status = 'LOST' ${empFilter} ${dateFilterOpportunities.clause}
     GROUP BY reason
     ORDER BY count DESC
     LIMIT 10`,
    [companyId, ...empParams, ...dateFilterOpportunities.params]
  );

  // 4. Drop-off analysis by stage
  const [dropOffAnalysis] = await db.query(
    `SELECT 
       csh.old_status as fromStage,
       csh.new_status as toStage,
       COUNT(*) as transitions
     FROM contact_status_history csh
     JOIN contacts c ON c.contact_id = csh.contact_id
     WHERE c.company_id = ? ${empFilter} ${dateFilterHistory.clause}
     GROUP BY csh.old_status, csh.new_status
     ORDER BY transitions DESC`,
    [companyId, ...empParams, ...dateFilterHistory.params]
  );

  // 5. Dormant conversion analysis
  const empFilterNoAlias = isAdmin ? '' : 'AND assigned_emp_id = ?';
  const [dormantAnalysis] = await db.query(
    `SELECT 
       (SELECT COUNT(*) FROM contacts WHERE company_id = ? AND status = 'DORMANT' ${empFilterNoAlias}) as totalDormant,
       (SELECT COUNT(*) FROM contacts c 
        JOIN contact_status_history csh ON csh.contact_id = c.contact_id 
        WHERE c.company_id = ? AND csh.new_status = 'DORMANT' ${empFilter}
        AND csh.changed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recentlyDormant,
       (SELECT AVG(DATEDIFF(csh.changed_at, c.created_at))
        FROM contacts c
        JOIN contact_status_history csh ON csh.contact_id = c.contact_id
        WHERE c.company_id = ? AND csh.new_status = 'DORMANT' ${empFilter}) as avgDaysBeforeDormant`,
    [companyId, ...empParams, companyId, ...empParams, companyId, ...empParams]
  );

  return {
    stageStagnation: stageStagnation.map(s => ({
      stage: s.stage,
      avgDays: Math.round(s.avgDaysInStage || 0),
      maxDays: Math.round(s.maxDaysInStage || 0),
      contactCount: s.count || 0,
    })),
    stuckContacts: stuckContacts.map(c => ({
      contactId: c.contact_id,
      name: c.name,
      email: c.email,
      currentStage: c.status,
      temperature: c.temperature,
      daysStuck: c.daysInStage || 0,
      lastContact: c.lastContact,
      assignedTo: c.assignedTo,
    })),
    lostReasons,
    dropOffAnalysis: calculateDropOffRates(dropOffAnalysis),
    dormantAnalysis: {
      totalDormant: dormantAnalysis[0].totalDormant || 0,
      recentlyDormant: dormantAnalysis[0].recentlyDormant || 0,
      avgDaysBeforeDormant: Math.round(dormantAnalysis[0].avgDaysBeforeDormant || 0),
    },
  };
};

/* ===================================================
   4. ACTION RECOMMENDATIONS
   "What should the team do next?"
=================================================== */

/**
 * Get actionable recommendations
 */
export const getRecommendations = async (companyId, empId) => {
  const isAdmin = !empId;
  const empFilter = isAdmin ? '' : 'AND c.assigned_emp_id = ?';
  const empParams = isAdmin ? [] : [empId];

  const recommendations = [];

  // 1. Hot leads needing immediate attention
  const [hotLeads] = await db.query(
    `SELECT COUNT(*) as count FROM contacts c
     WHERE c.company_id = ? AND c.temperature = 'HOT' 
     AND c.status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT') ${empFilter}
     AND (
       NOT EXISTS (SELECT 1 FROM sessions s WHERE s.contact_id = c.contact_id)
       OR (SELECT MAX(s.created_at) FROM sessions s WHERE s.contact_id = c.contact_id) < DATE_SUB(NOW(), INTERVAL 3 DAY)
     )`,
    [companyId, ...empParams]
  );

  if (hotLeads[0].count > 0) {
    recommendations.push({
      type: 'urgent',
      priority: 1,
      icon: 'flame',
      title: `${hotLeads[0].count} hot lead${hotLeads[0].count > 1 ? 's' : ''} need${hotLeads[0].count === 1 ? 's' : ''} attention`,
      description: 'Hot leads without recent contact. Reach out within 24 hours to maximize conversion.',
      action: 'View hot leads',
      actionUrl: '/contacts/lead?temperature=HOT',
    });
  }

  // 2. High-value opportunities at risk
  const [atRiskOpportunities] = await db.query(
    `SELECT COUNT(*) as count, COALESCE(SUM(o.expected_value), 0) as value
     FROM opportunities o
     JOIN contacts c ON c.contact_id = o.contact_id
     WHERE c.company_id = ? AND o.status = 'OPEN' ${empFilter}
     AND DATEDIFF(NOW(), o.updated_at) > 14`,
    [companyId, ...empParams]
  );

  if (atRiskOpportunities[0].count > 0) {
    recommendations.push({
      type: 'warning',
      priority: 2,
      icon: 'alertTriangle',
      title: `${atRiskOpportunities[0].count} opportunit${atRiskOpportunities[0].count > 1 ? 'ies' : 'y'} at risk`,
      description: `$${Number(atRiskOpportunities[0].value).toLocaleString()} in pipeline hasn't been updated in 14+ days.`,
      action: 'Review opportunities',
      actionUrl: '/contacts/opportunity',
    });
  }

  // 3. Leads about to go cold
  const [coolingLeads] = await db.query(
    `SELECT COUNT(*) as count FROM contacts c
     WHERE c.company_id = ? AND c.status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT') ${empFilter}
     AND DATEDIFF(NOW(), COALESCE(
       (SELECT MAX(s.created_at) FROM sessions s WHERE s.contact_id = c.contact_id),
       c.created_at
     )) BETWEEN 5 AND 7`,
    [companyId, ...empParams]
  );

  if (coolingLeads[0].count > 0) {
    recommendations.push({
      type: 'info',
      priority: 3,
      icon: 'clock',
      title: `${coolingLeads[0].count} lead${coolingLeads[0].count > 1 ? 's' : ''} cooling down`,
      description: 'No contact in 5-7 days. A quick follow-up can prevent them from going cold.',
      action: 'Schedule follow-ups',
      actionUrl: '/followups',
    });
  }

  // 4. SQLs ready for opportunity creation
  const [readySQLs] = await db.query(
    `SELECT COUNT(*) as count FROM contacts c
     WHERE c.company_id = ? AND c.status = 'SQL' ${empFilter}
     AND c.temperature IN ('HOT', 'WARM')
     AND NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.contact_id = c.contact_id AND o.status = 'OPEN')`,
    [companyId, ...empParams]
  );

  if (readySQLs[0].count > 0) {
    recommendations.push({
      type: 'success',
      priority: 4,
      icon: 'target',
      title: `${readySQLs[0].count} SQL${readySQLs[0].count > 1 ? 's' : ''} ready for opportunity`,
      description: 'Qualified leads with positive engagement. Consider creating opportunities.',
      action: 'View SQLs',
      actionUrl: '/contacts/sql',
    });
  }

  // 5. Customers for upsell/cross-sell
  const [upsellCandidates] = await db.query(
    `SELECT COUNT(*) as count FROM contacts c
     WHERE c.company_id = ? AND c.status = 'CUSTOMER' ${empFilter}
     AND EXISTS (SELECT 1 FROM deals d JOIN opportunities o ON d.opportunity_id = o.opportunity_id WHERE o.contact_id = c.contact_id)
     AND NOT EXISTS (
       SELECT 1 FROM opportunities o WHERE o.contact_id = c.contact_id AND o.status = 'OPEN'
     )
     AND DATEDIFF(NOW(), (
       SELECT MAX(d.closed_at) FROM deals d JOIN opportunities o ON d.opportunity_id = o.opportunity_id WHERE o.contact_id = c.contact_id
     )) > 90`,
    [companyId, ...empParams]
  );

  if (upsellCandidates[0].count > 0) {
    recommendations.push({
      type: 'opportunity',
      priority: 5,
      icon: 'trendingUp',
      title: `${upsellCandidates[0].count} customer${upsellCandidates[0].count > 1 ? 's' : ''} for potential upsell`,
      description: 'Customers with no recent activity. Great candidates for upsell or cross-sell.',
      action: 'View customers',
      actionUrl: '/contacts/customer',
    });
  }

  // 6. Best performing source insight
  const [topSource] = await db.query(
    `SELECT source, 
       COUNT(*) as leads,
       SUM(CASE WHEN status IN ('CUSTOMER', 'EVANGELIST') THEN 1 ELSE 0 END) as converted
     FROM contacts c
     WHERE c.company_id = ? ${empFilter} AND source IS NOT NULL
     GROUP BY source
     HAVING converted > 0
     ORDER BY (converted / leads) DESC
     LIMIT 1`,
    [companyId, ...empParams]
  );

  if (topSource.length > 0 && topSource[0].leads >= 5) {
    const convRate = ((topSource[0].converted / topSource[0].leads) * 100).toFixed(0);
    recommendations.push({
      type: 'insight',
      priority: 6,
      icon: 'lightbulb',
      title: `${topSource[0].source} is your best lead source`,
      description: `${convRate}% conversion rate from ${topSource[0].leads} leads. Consider increasing investment.`,
      action: null,
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
};

/* ===================================================
   5. FILTER OPTIONS
   Get available filter values for dropdowns
=================================================== */

/**
 * Get available filter options
 */
export const getFilterOptions = async (companyId, empId) => {
  const isAdmin = !empId;

  // Sources
  const [sources] = await db.query(
    `SELECT DISTINCT COALESCE(source, 'Unknown') as value 
     FROM contacts WHERE company_id = ? 
     ORDER BY value`,
    [companyId]
  );

  // Employees (admin only)
  let employees = [];
  if (isAdmin) {
    const [empRows] = await db.query(
      `SELECT emp_id as empId, name 
       FROM employees WHERE company_id = ? AND invitation_status = 'ACTIVE'
       ORDER BY name`,
      [companyId]
    );
    employees = empRows;
  }

  // Products
  const [products] = await db.query(
    `SELECT DISTINCT product as value 
     FROM deals d
     JOIN opportunities o ON d.opportunity_id = o.opportunity_id
     JOIN contacts c ON o.contact_id = c.contact_id
     WHERE c.company_id = ? AND product IS NOT NULL
     ORDER BY product`,
    [companyId]
  );

  return {
    sources: sources.map(s => s.value),
    employees,
    products: products.map(p => p.value),
    datePresets: [
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: 'last7days', label: 'Last 7 Days' },
      { value: 'last30days', label: 'Last 30 Days' },
      { value: 'last90days', label: 'Last 90 Days' },
      { value: 'thisMonth', label: 'This Month' },
      { value: 'lastMonth', label: 'Last Month' },
      { value: 'thisQuarter', label: 'This Quarter' },
      { value: 'thisYear', label: 'This Year' },
      { value: 'custom', label: 'Custom Range' },
    ],
  };
};

/* ===================================================
   6. TRENDS DATA
   Time-series data for charts
=================================================== */

/**
 * Get trend data for charts
 */
export const getTrendsData = async (companyId, empId, filters = {}) => {
  const { period = 'weekly', dateRange, source, assignedTo } = filters;
  const isAdmin = !empId;

  // Employee scope filter
  const empFilter = isAdmin ? '' : 'AND c.assigned_emp_id = ?';
  const empParams = isAdmin ? [] : [empId];

  // Source filter (same pattern as getBusinessPerformance)
  const sourceFilter = source ? 'AND c.source = ?' : '';
  const sourceParams = source ? [source] : [];

  // Admin "assigned to" filter
  const assignedFilter = assignedTo && isAdmin ? 'AND c.assigned_emp_id = ?' : '';
  const assignedParams = assignedTo && isAdmin ? [assignedTo] : [];

  // Date filter — use user-selected range via buildDateFilter, fallback to interval
  const dateFilterContacts = buildDateFilter(dateRange, 'c.created_at');
  const dateFilterHistory = buildDateFilter(dateRange, 'csh.changed_at');
  const dateFilterDeals = buildDateFilter(dateRange, 'd.closed_at');

  // Fallback interval only when no explicit date range is provided
  const fallbackInterval = period === 'daily' ? '30 DAY' : period === 'monthly' ? '12 MONTH' : '12 WEEK';
  const fallbackContactsClause = dateFilterContacts.clause ? '' : `AND c.created_at >= DATE_SUB(NOW(), INTERVAL ${fallbackInterval})`;
  const fallbackHistoryClause = dateFilterHistory.clause ? '' : `AND csh.changed_at >= DATE_SUB(NOW(), INTERVAL ${fallbackInterval})`;
  const fallbackDealsClause = dateFilterDeals.clause ? '' : `AND d.closed_at >= DATE_SUB(NOW(), INTERVAL ${fallbackInterval})`;

  const groupByContacts = period === 'daily' 
    ? "DATE_FORMAT(c.created_at, '%Y-%m-%d')"
    : period === 'monthly'
    ? "DATE_FORMAT(c.created_at, '%Y-%m')"
    : "YEARWEEK(c.created_at, 1)";

  const groupByHistory = period === 'daily' 
    ? "DATE_FORMAT(csh.changed_at, '%Y-%m-%d')"
    : period === 'monthly'
    ? "DATE_FORMAT(csh.changed_at, '%Y-%m')"
    : "YEARWEEK(csh.changed_at, 1)";

  const groupByDeals = period === 'daily' 
    ? "DATE_FORMAT(d.closed_at, '%Y-%m-%d')"
    : period === 'monthly'
    ? "DATE_FORMAT(d.closed_at, '%Y-%m')"
    : "YEARWEEK(d.closed_at, 1)";

  const dateFormat = period === 'daily'
    ? "'%b %d'"
    : period === 'monthly'
    ? "'%b %Y'"
    : null;

  // Lead acquisition trend
  const [leadTrend] = await db.query(
    `SELECT 
       ${groupByContacts} as period,
       ${dateFormat ? `DATE_FORMAT(MIN(c.created_at), ${dateFormat})` : `DATE_FORMAT(MIN(DATE(c.created_at)), '%b %d')`} as label,
       COUNT(*) as value
     FROM contacts c
     WHERE c.company_id = ? ${empFilter} ${sourceFilter} ${assignedFilter}
     ${dateFilterContacts.clause} ${fallbackContactsClause}
     GROUP BY ${groupByContacts}
     ORDER BY period`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams, ...dateFilterContacts.params]
  );

  // Conversion trend
  const [conversionTrend] = await db.query(
    `SELECT 
       ${groupByHistory} as period,
       ${dateFormat ? `DATE_FORMAT(MIN(csh.changed_at), ${dateFormat})` : `DATE_FORMAT(MIN(DATE(csh.changed_at)), '%b %d')`} as label,
       COUNT(*) as value
     FROM contact_status_history csh
     JOIN contacts c ON c.contact_id = csh.contact_id
     WHERE c.company_id = ? ${empFilter} ${sourceFilter} ${assignedFilter}
     AND csh.new_status = 'CUSTOMER'
     ${dateFilterHistory.clause} ${fallbackHistoryClause}
     GROUP BY ${groupByHistory}
     ORDER BY period`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams, ...dateFilterHistory.params]
  );

  // Revenue trend
  const [revenueTrend] = await db.query(
    `SELECT 
       ${groupByDeals} as period,
       ${dateFormat ? `DATE_FORMAT(MIN(d.closed_at), ${dateFormat})` : `DATE_FORMAT(MIN(DATE(d.closed_at)), '%b %d')`} as label,
       COUNT(d.deal_id) as deals,
       COALESCE(SUM(d.deal_value), 0) as revenue
     FROM deals d
     JOIN opportunities o ON o.opportunity_id = d.opportunity_id
     JOIN contacts c ON c.contact_id = o.contact_id
     WHERE c.company_id = ? ${empFilter} ${sourceFilter} ${assignedFilter}
     ${dateFilterDeals.clause} ${fallbackDealsClause}
     GROUP BY ${groupByDeals}
     ORDER BY period`,
    [companyId, ...empParams, ...sourceParams, ...assignedParams, ...dateFilterDeals.params]
  );

  // Merge all three trend arrays by period key (not by array index)
  // This prevents misalignment when some periods have leads but no conversions
  const conversionsByPeriod = Object.fromEntries(
    conversionTrend.map(item => [String(item.period), item])
  );
  const revenueByPeriod = Object.fromEntries(
    revenueTrend.map(item => [String(item.period), item])
  );

  // Use leadTrend as the base (most complete dataset), enrich from others
  const mergedData = leadTrend.map(item => {
    const periodKey = String(item.period);
    const conv = conversionsByPeriod[periodKey];
    const rev = revenueByPeriod[periodKey];
    return {
      period: periodKey,
      label: item.label,
      leads: Number(item.value) || 0,
      conversions: Number(conv?.value) || 0,
      revenue: Number(rev?.revenue) || 0,
    };
  });

  return {
    period,
    data: mergedData,
  };
};
