import { CheckCircle2, XCircle, AlertCircle, Activity } from "lucide-react";
const getStatusIcon = (status) => {
switch (status) {
    case 'CONNECTED':
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'NOT_CONNECTED':
    return <XCircle className="w-4 h-4 text-red-500" />;
    case 'BAD_TIMING':
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
    default:
    return <Activity className="w-4 h-4 text-gray-400" />;
}
};
export default getStatusIcon;