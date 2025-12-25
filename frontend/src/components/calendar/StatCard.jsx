// Stat Card Component
const StatCard = ({ label, value, icon, color, urgent }) => {
  const colorClasses = {
    sky: "bg-sky-50 text-sky-600 border-sky-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    red: "bg-red-50 text-red-600 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]} ${urgent ? "animate-pulse" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm opacity-70">{label}</p>
        </div>
        <div className={`p-2 rounded-lg ${color === "sky" ? "bg-sky-100" : color === "blue" ? "bg-blue-100" : color === "emerald" ? "bg-emerald-100" : color === "red" ? "bg-red-100" : "bg-gray-100"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
export default StatCard;