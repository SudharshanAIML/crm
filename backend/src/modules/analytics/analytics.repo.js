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
