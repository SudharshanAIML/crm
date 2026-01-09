// Core components
export { default as Pagination } from "./tools/Pagination";
export { default as StatsCard } from "./tools/StatsCard";
export { default as EmployeesTable } from "./EmployeesTable";
export { default as AnalyticsTab } from "./tabs/AnalyticsTab";
export { default as DashboardHeader } from "./DashboardHeader";
export { default as TeamTab } from "./tabs/TeamTab";
export { default as ContactsTab } from "./tabs/ContactsTab";

// Modals
export { default as AddEmployeeModal } from "./modals/AddEmployeeModal";
export { default as DeleteConfirmModal } from "./modals/DeleteConfirmModal";
export { default as EmployeeDetailPanel } from "./modals/EmployeeDetailPanel";

// Filter components
export { FilterBar, FilterDropdown } from "./tools/FilterBar";

// Status badges
export { default as getContactStatusBadge } from "./status/ContactStatusBadge";
export { default as getInvitationStatusBadge } from "./status/InvitationStatusBadge";

// Icons
export { default as getStatusIcon } from "./icons/StatusIcon";
export { default as getTemperatureIcon } from "./icons/TemperatureIcon";
export { default as SortIcon } from "./icons/SortIcon";

// Analytics sub-components (for custom compositions)
export {
  KPICards,
  PeriodComparison,
  ConversionFunnel,
  OpportunityOutcomes,
  SourcePerformance,
  TemperatureDistribution,
  SessionStatistics,
  EmployeeLeaderboard,
  MonthlyTrends,
  TopSources,
  AnalyticsLoading,
  AnalyticsError
} from "./AnalyticsComponents";