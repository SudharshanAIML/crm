// Get contact status badge
const getContactStatusBadge = (status) => {
const statusConfig = {
    LEAD: { bg: 'bg-gray-100', text: 'text-gray-700' },
    MQL: { bg: 'bg-blue-100', text: 'text-blue-700' },
    SQL: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    OPPORTUNITY: { bg: 'bg-purple-100', text: 'text-purple-700' },
    CUSTOMER: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    EVANGELIST: { bg: 'bg-amber-100', text: 'text-amber-700' },
};
const config = statusConfig[status] || statusConfig.LEAD;
return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
    {status}
    </span>
);
};
export default getContactStatusBadge;