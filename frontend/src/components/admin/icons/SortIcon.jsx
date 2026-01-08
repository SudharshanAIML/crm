import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
// Sort icon component
const SortIcon = ({ column, currentSort }) => {
if (currentSort.column !== column) {
    return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
}
return currentSort.direction === 'asc' 
    ? <ChevronUp className="w-3.5 h-3.5 text-sky-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-sky-500" />;
};
export default SortIcon;