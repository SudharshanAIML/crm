import { db } from "../../config/db.js";

/* ---------------------------------------------------
   GET PIPELINE STATS (CONTACTS BY STATUS)
--------------------------------------------------- */
export const getPipelineStats = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT 
      status,
      COUNT(*) as count
    FROM contacts
    WHERE company_id = ?
    GROUP BY status
    `,
    [companyId]
  );
  return rows;
};

/* ---------------------------------------------------
   GET REVENUE STATS
--------------------------------------------------- */
export const getRevenueStats = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT 
      SUM(d.deal_value) as totalRevenue,
      COUNT(d.deal_id) as totalDeals,
      AVG(d.deal_value) as avgDealValue
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ?
    `,
    [companyId]
  );
  return rows[0];
};

/* ---------------------------------------------------
   GET CONVERSION RATES
--------------------------------------------------- */
export const getConversionRates = async (companyId) => {
  const [totalLeads] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ?`,
    [companyId]
  );

  const [mqls] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ? AND status IN ('MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST')`,
    [companyId]
  );

  const [sqls] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ? AND status IN ('SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST')`,
    [companyId]
  );

  const [opportunities] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ? AND status IN ('OPPORTUNITY', 'CUSTOMER', 'EVANGELIST')`,
    [companyId]
  );

  const [customers] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ? AND status IN ('CUSTOMER', 'EVANGELIST')`,
    [companyId]
  );

  const [evangelists] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ? AND status = 'EVANGELIST'`,
    [companyId]
  );

  return {
    totalLeads: totalLeads[0].count,
    mqls: mqls[0].count,
    sqls: sqls[0].count,
    opportunities: opportunities[0].count,
    customers: customers[0].count,
    evangelists: evangelists[0].count,
  };
};

/* ---------------------------------------------------
   GET EMPLOYEE PERFORMANCE
--------------------------------------------------- */
export const getEmployeePerformance = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT 
      e.emp_id,
      e.name,
      COUNT(DISTINCT c.contact_id) as contactsHandled,
      COUNT(DISTINCT d.deal_id) as dealsClosed,
      SUM(d.deal_value) as totalRevenue
    FROM employees e
    LEFT JOIN contacts c ON c.assigned_emp_id = e.emp_id
    LEFT JOIN opportunities o ON o.emp_id = e.emp_id
    LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id
    WHERE e.company_id = ?
    GROUP BY e.emp_id, e.name
    ORDER BY totalRevenue DESC
    `,
    [companyId]
  );
  return rows;
};

/* ---------------------------------------------------
   GET SESSION STATS
--------------------------------------------------- */
export const getSessionStats = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT 
      s.stage,
      COUNT(*) as totalSessions,
      AVG(s.rating) as avgRating,
      SUM(CASE WHEN s.session_status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
      SUM(CASE WHEN s.session_status = 'NOT_CONNECTED' THEN 1 ELSE 0 END) as notConnected,
      SUM(CASE WHEN s.session_status = 'BAD_TIMING' THEN 1 ELSE 0 END) as badTiming
    FROM sessions s
    JOIN contacts c ON c.contact_id = s.contact_id
    WHERE c.company_id = ?
    GROUP BY s.stage
    `,
    [companyId]
  );
  return rows;
};

/* ---------------------------------------------------
   GET RECENT ACTIVITIES
--------------------------------------------------- */
export const getRecentActivities = async (companyId, limit = 20) => {
  const [rows] = await db.query(
    `
    SELECT 
      'status_change' as type,
      csh.contact_id,
      c.name as contact_name,
      csh.old_status,
      csh.new_status,
      e.name as changed_by_name,
      csh.changed_at as timestamp
    FROM contact_status_history csh
    JOIN contacts c ON c.contact_id = csh.contact_id
    LEFT JOIN employees e ON e.emp_id = csh.changed_by
    WHERE c.company_id = ?
    ORDER BY csh.changed_at DESC
    LIMIT ?
    `,
    [companyId, limit]
  );
  return rows;
};

/* ---------------------------------------------------
   ADMIN: GET TEAM MEMBERS WITH STATS
--------------------------------------------------- */
export const getTeamMembers = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT 
      e.emp_id,
      e.name,
      e.email,
      e.phone,
      e.department,
      e.role,
      e.created_at,
      COUNT(DISTINCT c.contact_id) as contactsHandled,
      COUNT(DISTINCT d.deal_id) as dealsClosed,
      COALESCE(SUM(d.deal_value), 0) as totalRevenue
    FROM employees e
    LEFT JOIN contacts c ON c.assigned_emp_id = e.emp_id
    LEFT JOIN opportunities o ON o.emp_id = e.emp_id
    LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id
    WHERE e.company_id = ?
    GROUP BY e.emp_id, e.name, e.email, e.phone, e.department, e.role, e.created_at
    ORDER BY totalRevenue DESC, e.name ASC
    `,
    [companyId]
  );
  return rows;
};

/* ---------------------------------------------------
   ADMIN: GET EMPLOYEE BY ID
--------------------------------------------------- */
export const getEmployeeById = async (companyId, empId) => {
  const [rows] = await db.query(
    `
    SELECT 
      e.emp_id,
      e.name,
      e.email,
      e.phone,
      e.department,
      e.role,
      e.created_at,
      COUNT(DISTINCT c.contact_id) as contactsHandled,
      COUNT(DISTINCT d.deal_id) as dealsClosed,
      COALESCE(SUM(d.deal_value), 0) as totalRevenue
    FROM employees e
    LEFT JOIN contacts c ON c.assigned_emp_id = e.emp_id
    LEFT JOIN opportunities o ON o.emp_id = e.emp_id
    LEFT JOIN deals d ON d.opportunity_id = o.opportunity_id
    WHERE e.company_id = ? AND e.emp_id = ?
    GROUP BY e.emp_id, e.name, e.email, e.phone, e.department, e.role, e.created_at
    `,
    [companyId, empId]
  );
  return rows[0] || null;
};

/* ---------------------------------------------------
   ADMIN: GET EMPLOYEE ACTIVITIES (SESSIONS)
--------------------------------------------------- */
export const getEmployeeActivities = async (companyId, empId, limit = 20) => {
  const [rows] = await db.query(
    `
    SELECT 
      s.session_id,
      s.contact_id,
      c.name as contact_name,
      c.email as contact_email,
      c.status as contact_status,
      s.mode_of_contact,
      s.stage,
      s.session_status,
      s.rating,
      s.remarks,
      s.created_at
    FROM sessions s
    JOIN contacts c ON c.contact_id = s.contact_id
    WHERE s.emp_id = ? AND c.company_id = ?
    ORDER BY s.created_at DESC
    LIMIT ?
    `,
    [empId, companyId, limit]
  );
  return rows;
};

/* ---------------------------------------------------
   ADMIN: GET EMPLOYEE CONTACTS
--------------------------------------------------- */
export const getEmployeeContacts = async (companyId, empId, filters = {}) => {
  const { status, search, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE c.assigned_emp_id = ? AND c.company_id = ?';
  const params = [empId, companyId];
  
  if (status) {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }
  
  if (search) {
    whereClause += ' AND (c.name LIKE ? OR c.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  // Get total count
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM contacts c ${whereClause}`,
    params
  );
  
  // Get contacts
  const [rows] = await db.query(
    `
    SELECT 
      c.contact_id,
      c.name,
      c.email,
      c.phone,
      c.status,
      c.source,
      c.created_at,
      (SELECT COUNT(*) FROM sessions s WHERE s.contact_id = c.contact_id) as sessionCount,
      (SELECT s.created_at FROM sessions s WHERE s.contact_id = c.contact_id ORDER BY s.created_at DESC LIMIT 1) as lastSessionAt
    FROM contacts c
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );
  
  return {
    contacts: rows,
    pagination: {
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    }
  };
};

/* ---------------------------------------------------
   EMPLOYEE: GET COMPREHENSIVE ANALYTICS
--------------------------------------------------- */
export const getComprehensiveAnalytics = async (companyId, empId) => {
  // 1. Overview Metrics
  const [activeLeads] = await db.query(
    `SELECT COUNT(*) as count FROM contacts 
     WHERE company_id = ? AND assigned_emp_id = ? 
     AND status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT')`,
    [companyId, empId]
  );

  const [totalLeadsResult] = await db.query(
    `SELECT COUNT(*) as count FROM contacts WHERE company_id = ? AND assigned_emp_id = ?`,
    [companyId, empId]
  );

  const [customersResult] = await db.query(
    `SELECT COUNT(*) as count FROM contacts 
     WHERE company_id = ? AND assigned_emp_id = ? 
     AND status IN ('CUSTOMER', 'EVANGELIST')`,
    [companyId, empId]
  );

  // Average days to close (from created to CUSTOMER status)
  const [avgDaysToClose] = await db.query(
    `SELECT AVG(DATEDIFF(csh.changed_at, c.created_at)) as avgDays
     FROM contacts c
     JOIN contact_status_history csh ON csh.contact_id = c.contact_id
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     AND csh.new_status = 'CUSTOMER'`,
    [companyId, empId]
  );

  // Leads needing attention (no session in 7+ days)
  const [leadsNeedingAttention] = await db.query(
    `SELECT COUNT(*) as count FROM contacts c
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     AND c.status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT')
     AND (
       NOT EXISTS (SELECT 1 FROM sessions s WHERE s.contact_id = c.contact_id)
       OR (SELECT MAX(s.created_at) FROM sessions s WHERE s.contact_id = c.contact_id) < DATE_SUB(NOW(), INTERVAL 7 DAY)
     )`,
    [companyId, empId]
  );

  // 2. Pipeline Funnel with conversions
  const [funnelData] = await db.query(
    `SELECT status, COUNT(*) as count FROM contacts 
     WHERE company_id = ? AND assigned_emp_id = ?
     GROUP BY status`,
    [companyId, empId]
  );

  // 3. Stage Performance - Average time in each stage
  const [stageTime] = await db.query(
    `SELECT 
       csh.new_status as stage,
       AVG(DATEDIFF(
         COALESCE(
           (SELECT MIN(csh2.changed_at) FROM contact_status_history csh2 
            WHERE csh2.contact_id = csh.contact_id AND csh2.changed_at > csh.changed_at),
           NOW()
         ), 
         csh.changed_at
       )) as avgDays
     FROM contact_status_history csh
     JOIN contacts c ON c.contact_id = csh.contact_id
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     GROUP BY csh.new_status`,
    [companyId, empId]
  );

  // Leads stuck longer than average
  const [stuckLeads] = await db.query(
    `SELECT c.contact_id, c.name, c.email, c.status, 
            DATEDIFF(NOW(), COALESCE(
              (SELECT MAX(csh.changed_at) FROM contact_status_history csh WHERE csh.contact_id = c.contact_id),
              c.created_at
            )) as daysInStage
     FROM contacts c
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     AND c.status NOT IN ('CUSTOMER', 'EVANGELIST', 'DORMANT')
     HAVING daysInStage > 14
     ORDER BY daysInStage DESC
     LIMIT 10`,
    [companyId, empId]
  );

  // 4. Follow-up Effectiveness
  const [sessionStats] = await db.query(
    `SELECT 
       COUNT(*) as totalSessions,
       SUM(CASE WHEN session_status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
       SUM(CASE WHEN session_status = 'NOT_CONNECTED' THEN 1 ELSE 0 END) as notConnected,
       SUM(CASE WHEN session_status = 'BAD_TIMING' THEN 1 ELSE 0 END) as badTiming,
       AVG(rating) as avgRating
     FROM sessions s
     JOIN contacts c ON c.contact_id = s.contact_id
     WHERE c.company_id = ? AND s.emp_id = ?`,
    [companyId, empId]
  );

  // Conversion rate for leads contacted within 24 hours
  const [quickResponseConversion] = await db.query(
    `SELECT 
       COUNT(DISTINCT CASE WHEN c.status IN ('CUSTOMER', 'EVANGELIST') THEN c.contact_id END) as converted,
       COUNT(DISTINCT c.contact_id) as total
     FROM contacts c
     JOIN sessions s ON s.contact_id = c.contact_id
     WHERE c.company_id = ? AND s.emp_id = ?
     AND s.created_at <= DATE_ADD(c.created_at, INTERVAL 24 HOUR)`,
    [companyId, empId]
  );

  const [laterResponseConversion] = await db.query(
    `SELECT 
       COUNT(DISTINCT CASE WHEN c.status IN ('CUSTOMER', 'EVANGELIST') THEN c.contact_id END) as converted,
       COUNT(DISTINCT c.contact_id) as total
     FROM contacts c
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     AND NOT EXISTS (
       SELECT 1 FROM sessions s 
       WHERE s.contact_id = c.contact_id 
       AND s.created_at <= DATE_ADD(c.created_at, INTERVAL 24 HOUR)
     )`,
    [companyId, empId]
  );

  // 5. Lead Temperature Insights (based on latest session rating)
  const [temperatureStats] = await db.query(
    `SELECT 
       CASE 
         WHEN latest_rating >= 8 THEN 'HOT'
         WHEN latest_rating >= 5 THEN 'WARM'
         ELSE 'COLD'
       END as temperature,
       COUNT(*) as count,
       SUM(CASE WHEN c.status IN ('CUSTOMER', 'EVANGELIST') THEN 1 ELSE 0 END) as converted
     FROM (
       SELECT c.contact_id, c.status,
              (SELECT s.rating FROM sessions s WHERE s.contact_id = c.contact_id ORDER BY s.created_at DESC LIMIT 1) as latest_rating
       FROM contacts c
       WHERE c.company_id = ? AND c.assigned_emp_id = ?
       AND EXISTS (SELECT 1 FROM sessions s WHERE s.contact_id = c.contact_id)
     ) as c
     WHERE latest_rating IS NOT NULL
     GROUP BY temperature`,
    [companyId, empId]
  );

  // 6. Source Performance
  const [sourceStats] = await db.query(
    `SELECT 
       COALESCE(source, 'Unknown') as source,
       COUNT(*) as totalLeads,
       SUM(CASE WHEN status IN ('CUSTOMER', 'EVANGELIST') THEN 1 ELSE 0 END) as converted,
       AVG(CASE WHEN status IN ('CUSTOMER', 'EVANGELIST') 
           THEN DATEDIFF(
             (SELECT csh.changed_at FROM contact_status_history csh 
              WHERE csh.contact_id = c.contact_id AND csh.new_status = 'CUSTOMER' LIMIT 1),
             c.created_at
           ) END) as avgDaysToClose
     FROM contacts c
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     GROUP BY source
     ORDER BY totalLeads DESC`,
    [companyId, empId]
  );

  // 7. Trends Over Time (last 12 weeks)
  const [weeklyTrends] = await db.query(
    `SELECT 
       YEARWEEK(created_at, 1) as week,
       MIN(DATE(created_at)) as weekStart,
       COUNT(*) as leadsCreated
     FROM contacts
     WHERE company_id = ? AND assigned_emp_id = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY YEARWEEK(created_at, 1)
     ORDER BY week`,
    [companyId, empId]
  );

  const [conversionTrends] = await db.query(
    `SELECT 
       YEARWEEK(csh.changed_at, 1) as week,
       MIN(DATE(csh.changed_at)) as weekStart,
       COUNT(*) as conversions
     FROM contact_status_history csh
     JOIN contacts c ON c.contact_id = csh.contact_id
     WHERE c.company_id = ? AND c.assigned_emp_id = ?
     AND csh.new_status = 'CUSTOMER'
     AND csh.changed_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY YEARWEEK(csh.changed_at, 1)
     ORDER BY week`,
    [companyId, empId]
  );

  // Calculate conversion rate
  const totalLeads = totalLeadsResult[0].count;
  const totalCustomers = customersResult[0].count;
  const conversionRate = totalLeads > 0 ? ((totalCustomers / totalLeads) * 100).toFixed(1) : 0;

  // Transform funnel data
  const funnelMap = {};
  funnelData.forEach(row => { funnelMap[row.status] = row.count; });
  
  const funnel = [
    { stage: 'LEAD', count: funnelMap['LEAD'] || 0 },
    { stage: 'MQL', count: funnelMap['MQL'] || 0 },
    { stage: 'SQL', count: funnelMap['SQL'] || 0 },
    { stage: 'OPPORTUNITY', count: funnelMap['OPPORTUNITY'] || 0 },
    { stage: 'CUSTOMER', count: funnelMap['CUSTOMER'] || 0 },
  ];

  // Calculate funnel conversions
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count;
    funnel[i].conversionRate = prev > 0 ? ((funnel[i].count / prev) * 100).toFixed(1) : 0;
    funnel[i].dropOff = prev > 0 ? (((prev - funnel[i].count) / prev) * 100).toFixed(1) : 0;
  }

  return {
    overview: {
      activeLeads: activeLeads[0].count,
      totalLeads,
      totalCustomers,
      conversionRate: parseFloat(conversionRate),
      avgDaysToClose: Math.round(avgDaysToClose[0].avgDays || 0),
      leadsNeedingAttention: leadsNeedingAttention[0].count,
    },
    funnel,
    stagePerformance: {
      avgTimeInStage: stageTime,
      stuckLeads,
    },
    followUpEffectiveness: {
      totalSessions: sessionStats[0].totalSessions || 0,
      connected: sessionStats[0].connected || 0,
      notConnected: sessionStats[0].notConnected || 0,
      badTiming: sessionStats[0].badTiming || 0,
      avgRating: parseFloat(sessionStats[0].avgRating || 0).toFixed(1),
      quickResponseConversion: {
        rate: quickResponseConversion[0].total > 0 
          ? ((quickResponseConversion[0].converted / quickResponseConversion[0].total) * 100).toFixed(1)
          : 0,
        total: quickResponseConversion[0].total,
      },
      laterResponseConversion: {
        rate: laterResponseConversion[0].total > 0
          ? ((laterResponseConversion[0].converted / laterResponseConversion[0].total) * 100).toFixed(1)
          : 0,
        total: laterResponseConversion[0].total,
      },
    },
    temperatureInsights: temperatureStats,
    sourcePerformance: sourceStats,
    trends: {
      weekly: weeklyTrends,
      conversions: conversionTrends,
    },
  };
};
