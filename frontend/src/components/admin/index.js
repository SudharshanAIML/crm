// Core components
export { default as Pagination } from "./Pagination";
export { default as StatsCard } from "./StatsCard";
export { default as EmployeesTable } from "./EmployeesTable";
export { default as ContactsTable } from "./ContactsTable";
export { default as AnalyticsTab } from "./AnalyticsTab";
export { default as AdminHeader } from "./AdminHeader";
export { default as DashboardHeader } from "./DashboardHeader";
export { default as TeamTab } from "./TeamTab";
export { default as ContactsTab } from "./ContactsTab";

// Modals
export { default as AddEmployeeModal } from "./AddEmployeeModal";
export { default as DeleteConfirmModal } from "./DeleteConfirmModal";
export { default as EmployeeDetailPanel } from "./EmployeeDetailPanel";

// Filter components
export { FilterBar, FilterDropdown } from "./FilterBar";

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