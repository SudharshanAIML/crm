import { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  Users, 
  BarChart3, 
  AlertCircle,
  RefreshCw,
  Award,
  Percent,
  PieChart,
  Eye,
  X
} from 'lucide-react';
import { getProductAnalytics } from '../../services/analyticsService';
import { useCurrency } from '../../context/CurrencyContext';

export default function ProductAnalytics() {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProductAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductAnalytics();
      setProductData(data);
    } catch (err) {
      console.error('Failed to fetch product analytics:', err);
      setError('Failed to load product analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductAnalytics();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchProductAnalytics();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <ProductAnalyticsSkeleton />
      </div>
    );
  }

  if (error && !productData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { overview, products } = productData || {};
  const { formatCompact, format: formatCurrency } = useCurrency();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Product Analytics</h1>
          <p className="text-gray-500">Track product performance and sales insights</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="Total Products"
          value={overview?.totalProducts || 0}
          icon={<Package className="w-5 h-5" />}
          color="sky"
        />
        <OverviewCard
          title="Total Revenue"
          value={formatCompact(overview?.totalRevenue || 0)}
          subtitle={`${overview?.totalDeals || 0} deals closed`}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <OverviewCard
          title="Avg Revenue/Product"
          value={formatCurrency(overview?.avgRevenuePerProduct || 0, { compact: false })}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
        <OverviewCard
          title="Top Product"
          value={overview?.topProduct || 'N/A'}
          subtitle={formatCompact(overview?.topProductRevenue || 0)}
          icon={<Award className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Product Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-800">Product Performance</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Click on any product to see detailed insights</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Total Deals
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Avg Deal Value
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Customers
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Revenue Share
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products && products.length > 0 ? (
                products.map((product, index) => (
                  <tr key={index} className="hover:bg-sky-50 transition-colors cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {product.totalDeals}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-emerald-600">
                          {formatCompact(product.totalRevenue || 0)}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                        {formatCompact(product.avgDealValue || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{product.uniqueCustomers}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-sky-500 h-2 rounded-full transition-all"
                            style={{ width: `${product.revenueShare}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {product.revenueShare}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}
                        className="text-sky-600 hover:text-sky-700 font-medium text-sm flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No product data available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Products will appear here once deals are closed with product names
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Product Charts */}
      {products && products.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Distribution Pie Chart */}
          <RevenuePieChart products={products} totalRevenue={overview?.totalRevenue || 0} onProductClick={setSelectedProduct} formatCompact={formatCompact} />

          {/* Deal Count Distribution */}
          <DealCountChart products={products} onProductClick={setSelectedProduct} />
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          allProducts={products}
          totalRevenue={overview?.totalRevenue || 0}
          onClose={() => setSelectedProduct(null)}
          formatCompact={formatCompact}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

// Revenue Pie Chart Component
function RevenuePieChart({ products, totalRevenue, onProductClick, formatCompact }) {
  const colors = [
    '#0ea5e9', // sky-500
    '#8b5cf6', // purple-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
  ];

  const topProducts = products.slice(0, 8);
  const othersRevenue = products.slice(8).reduce((sum, p) => sum + p.totalRevenue, 0);
  
  const chartData = topProducts.map((p, i) => ({
    ...p,
    color: colors[i % colors.length]
  }));

  if (othersRevenue > 0) {
    chartData.push({
      name: 'Others',
      totalRevenue: othersRevenue,
      revenueShare: ((othersRevenue / totalRevenue) * 100).toFixed(1),
      color: '#9ca3af' // gray-400
    });
  }

  const radius = 100;
  const centerX = 120;
  const centerY = 120;
  let currentAngle = -90;

  const slices = chartData.map((item) => {
    const sliceAngle = (parseFloat(item.revenueShare) / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle = endAngle;
    
    return { ...item, pathData, startAngle, endAngle };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Revenue Distribution</h2>
      </div>
      
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <svg width="240" height="240" viewBox="0 0 240 240" className="flex-shrink-0">
          {slices.map((slice, index) => (
            <g key={index}>
              <path
                d={slice.pathData}
                fill={slice.color}
                className="hover:opacity-80 cursor-pointer transition-opacity"
                onClick={() => slice.name !== 'Others' && onProductClick(slice)}
              />
            </g>
          ))}
        </svg>
        
        <div className="flex-1 space-y-2 w-full">
          {chartData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              onClick={() => item.name !== 'Others' && onProductClick(item)}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCompact(item.totalRevenue || 0)}</p>
                <p className="text-xs text-gray-500">{item.revenueShare}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Deal Count Chart Component
function DealCountChart({ products, onProductClick }) {
  const colors = [
    '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', 
    '#ef4444', '#ec4899', '#6366f1', '#14b8a6'
  ];

  const topProducts = products.slice(0, 8);
  const maxDeals = Math.max(...topProducts.map(p => p.totalDeals));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Deal Count by Product</h2>
      </div>
      
      <div className="space-y-3">
        {topProducts.map((product, index) => (
          <div
            key={index}
            className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={() => onProductClick(product)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{product.name}</span>
              <span className="text-sm font-semibold text-gray-900">{product.totalDeals} deals</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{ 
                  width: `${(product.totalDeals / maxDeals) * 100}%`,
                  backgroundColor: colors[index % colors.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Product Detail Modal Component
function ProductDetailModal({ product, allProducts, totalRevenue, onClose, formatCompact, formatCurrency }) {
  const productRank = allProducts.findIndex(p => p.name === product.name) + 1;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{product.name}</h2>
                <p className="text-sky-100 text-sm">Product Performance Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Market Rank"
              value={`#${productRank}`}
              icon={<Award className="w-5 h-5 text-amber-600" />}
              color="amber"
            />
            <MetricCard
              label="Total Revenue"
              value={formatCompact(product.totalRevenue || 0)}
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              color="emerald"
            />
            <MetricCard
              label="Total Deals"
              value={product.totalDeals}
              icon={<BarChart3 className="w-5 h-5 text-sky-600" />}
              color="sky"
            />
            <MetricCard
              label="Customers"
              value={product.uniqueCustomers}
              icon={<Users className="w-5 h-5 text-purple-600" />}
              color="purple"
            />
          </div>

          {/* Revenue Analysis */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Market Share</p>
                <p className="text-2xl font-bold text-gray-900">{product.revenueShare}%</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full"
                    style={{ width: `${product.revenueShare}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Deal Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCompact(product.avgDealValue || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Per transaction</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Revenue per Customer</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency((product.totalRevenue / (product.uniqueCustomers || 1)) || 0, { compact: false, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Average value</p>
              </div>
            </div>
          </div>

          {/* Deal Value Range */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Deal Value Range</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Minimum</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(product.minDealValue || 0, { compact: false })}</span>
              </div>
              <div className="relative pt-2 pb-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="absolute left-0 top-2 w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <div className="absolute right-0 top-2 w-2 h-2 bg-red-500 rounded-full"></div>
                  <div 
                    className="absolute top-2 w-2 h-2 bg-sky-500 rounded-full"
                    style={{ left: `${((product.avgDealValue - product.minDealValue) / (product.maxDealValue - product.minDealValue)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Average</span>
                <span className="text-lg font-semibold text-sky-600">{formatCurrency(product.avgDealValue || 0, { compact: false })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Maximum</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(product.maxDealValue || 0, { compact: false })}</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              Key Insights
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-sky-600 mt-0.5">•</span>
                <span>This product ranks <strong>#{productRank}</strong> out of {allProducts.length} products in your portfolio</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-600 mt-0.5">•</span>
                <span>Contributes <strong>{product.revenueShare}%</strong> to total revenue ({formatCompact(totalRevenue || 0)})</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-600 mt-0.5">•</span>
                <span>Average of <strong>{(product.totalDeals / product.uniqueCustomers).toFixed(1)}</strong> deals per customer</span>
              </li>
              {product.revenueShare >= 20 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">⭐</span>
                  <span className="font-medium text-amber-700">Top performer - This is one of your best-selling products!</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ label, value, icon, color }) {
  const colorClasses = {
    sky: "bg-sky-50 border-sky-200",
    emerald: "bg-emerald-50 border-emerald-200",
    purple: "bg-purple-50 border-purple-200",
    amber: "bg-amber-50 border-amber-200",
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs font-medium text-gray-600 uppercase">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// Overview Card Component
function OverviewCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    sky: "bg-sky-50 text-sky-600 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  };

  const bgClasses = {
    sky: "bg-sky-100",
    emerald: "bg-emerald-100",
    purple: "bg-purple-100",
    amber: "bg-amber-100",
  };

  return (
    <div className={`p-5 rounded-xl border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bgClasses[color]}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Skeleton Loader
function ProductAnalyticsSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl border-2 border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    </>
  );
}
