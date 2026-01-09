import { Users, Target, TrendingUp, DollarSign } from 'lucide-react';
const StatsCard = ({ employees, activeCount, invitedCount, totalLeads, avgLeadsPerEmployee, totalConversions, conversionRate, totalRevenue, formatCompact, formatCurrency }) => {
    return (
        <div className="mb-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Organization Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-sky-600" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Total Team</p>
                <p className="text-xl font-bold text-gray-900">{employees.length}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-emerald-600">{activeCount} active</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-amber-600">{invitedCount} pending</span>
                </div>
            </div>
            </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Total Leads</p>
                <p className="text-xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">~{avgLeadsPerEmployee}/employee</p>
            </div>
            </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Conversions</p>
                <p className="text-xl font-bold text-gray-900">{totalConversions.toLocaleString()}</p>
                <p className={`text-xs mt-0.5 ${parseFloat(conversionRate) > 20 ? 'text-emerald-600' : parseFloat(conversionRate) > 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                {conversionRate}% rate
                </p>
            </div>
            </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                {formatCompact(totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrency(totalConversions > 0 ? Math.round(totalRevenue / totalConversions) : 0, { compact: false })} avg
                </p>
            </div>
            </div>
        </div>
        </div>
        </div>
    );
}
export default StatsCard;