import { Clock, CheckCircle2, Ban, AlertCircle } from 'lucide-react';
const getInvitationStatusBadge = (status) => {
switch (status) {
    case 'INVITED':
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />
        Invited
        </span>
    );
    case 'ACTIVE':
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        Active
        </span>
    );
    case 'DISABLED':
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">
        <Ban className="w-3 h-3" />
        Disabled
        </span>
    );
    default:
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
        <AlertCircle className="w-3 h-3" />
        {status || 'Pending'}
        </span>
    );
}
};
export default getInvitationStatusBadge;