import { db } from "../../config/db.js";

/* ---------------------------------------------------
   GET PRODUCT ANALYTICS
--------------------------------------------------- */
export const getProductAnalytics = async (companyId) => {
  // Get product performance - deals grouped by product
  const [productStats] = await db.query(
    `
    SELECT 
      COALESCE(d.product, 'Unknown') as product_name,
      COUNT(d.deal_id) as total_deals,
      SUM(d.deal_value) as total_revenue,
      AVG(d.deal_value) as avg_deal_value,
      MIN(d.deal_value) as min_deal_value,
      MAX(d.deal_value) as max_deal_value,
      COUNT(DISTINCT o.contact_id) as unique_customers
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ?
    GROUP BY d.product
    ORDER BY total_revenue DESC
    `,
    [companyId]
  );

  // Get product trends over time (last 6 months)
  const [productTrends] = await db.query(
    `
    SELECT 
      COALESCE(d.product, 'Unknown') as product_name,
      DATE_FORMAT(d.closed_at, '%Y-%m') as month,
      COUNT(d.deal_id) as deals_count,
      SUM(d.deal_value) as revenue
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ?
      AND d.closed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY d.product, DATE_FORMAT(d.closed_at, '%Y-%m')
    ORDER BY month DESC, revenue DESC
    `,
    [companyId]
  );

  // Get product by customer status
  const [productByStatus] = await db.query(
    `
    SELECT 
      COALESCE(d.product, 'Unknown') as product_name,
      c.status,
      COUNT(DISTINCT c.contact_id) as customer_count
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ?
    GROUP BY d.product, c.status
    ORDER BY customer_count DESC
    `,
    [companyId]
  );

  // Get product with employee performance
  const [productByEmployee] = await db.query(
    `
    SELECT 
      COALESCE(d.product, 'Unknown') as product_name,
      e.name as employee_name,
      e.emp_id,
      COUNT(d.deal_id) as deals_closed,
      SUM(d.deal_value) as revenue
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    JOIN employees e ON e.emp_id = d.closed_by
    WHERE c.company_id = ?
    GROUP BY d.product, e.emp_id, e.name
    ORDER BY revenue DESC
    `,
    [companyId]
  );

  // Calculate overall stats
  const totalRevenue = productStats.reduce((sum, p) => sum + parseFloat(p.total_revenue || 0), 0);
  const totalDeals = productStats.reduce((sum, p) => sum + parseInt(p.total_deals || 0), 0);
  const totalProducts = productStats.length;
  const avgRevenuePerProduct = totalProducts > 0 ? totalRevenue / totalProducts : 0;

  // Find top performing product
  const topProduct = productStats.length > 0 ? productStats[0] : null;

  // Calculate product diversity (how evenly distributed revenue is)
  const revenueDistribution = productStats.map(p => parseFloat(p.total_revenue || 0));
  const maxRevenue = Math.max(...revenueDistribution, 0);
  const diversityScore = totalProducts > 1 
    ? revenueDistribution.filter(r => r >= maxRevenue * 0.3).length / totalProducts * 100
    : 0;

  return {
    overview: {
      totalProducts,
      totalRevenue,
      totalDeals,
      avgRevenuePerProduct,
      diversityScore: Math.round(diversityScore),
      topProduct: topProduct ? topProduct.product_name : null,
      topProductRevenue: topProduct ? parseFloat(topProduct.total_revenue) : 0,
    },
    products: productStats.map(p => ({
      name: p.product_name,
      totalDeals: parseInt(p.total_deals),
      totalRevenue: parseFloat(p.total_revenue || 0),
      avgDealValue: parseFloat(p.avg_deal_value || 0),
      minDealValue: parseFloat(p.min_deal_value || 0),
      maxDealValue: parseFloat(p.max_deal_value || 0),
      uniqueCustomers: parseInt(p.unique_customers),
      revenueShare: totalRevenue > 0 ? ((parseFloat(p.total_revenue || 0) / totalRevenue) * 100).toFixed(1) : 0,
    })),
    trends: productTrends,
    byStatus: productByStatus,
    byEmployee: productByEmployee,
  };
};

/* ---------------------------------------------------
   GET PRODUCT BY NAME (DETAILED)
--------------------------------------------------- */
export const getProductDetails = async (companyId, productName) => {
  // Get detailed stats for a specific product
  const [productInfo] = await db.query(
    `
    SELECT 
      d.product as product_name,
      COUNT(d.deal_id) as total_deals,
      SUM(d.deal_value) as total_revenue,
      AVG(d.deal_value) as avg_deal_value,
      MIN(d.closed_at) as first_sale,
      MAX(d.closed_at) as last_sale
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ? AND d.product = ?
    GROUP BY d.product
    `,
    [companyId, productName]
  );

  // Get customers who bought this product
  const [customers] = await db.query(
    `
    SELECT 
      c.contact_id,
      c.name,
      c.email,
      c.status,
      c.temperature,
      d.deal_value,
      d.closed_at
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ? AND d.product = ?
    ORDER BY d.closed_at DESC
    `,
    [companyId, productName]
  );

  return {
    product: productInfo[0] || null,
    customers,
  };
};
