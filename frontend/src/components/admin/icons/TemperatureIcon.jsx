import { Flame, Thermometer, Snowflake } from 'lucide-react';
// Get temperature icon
const getTemperatureIcon = (temp) => {
switch (temp) {
    case 'HOT':
    return <Flame className="w-4 h-4 text-red-500" />;
    case 'WARM':
    return <Thermometer className="w-4 h-4 text-amber-500" />;
    case 'COLD':
    default:
    return <Snowflake className="w-4 h-4 text-blue-500" />;
}
};
export default getTemperatureIcon;