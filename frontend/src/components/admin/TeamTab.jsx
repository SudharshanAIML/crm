import { memo } from 'react';
import { Search, ChevronDown, UserPlus } from 'lucide-react';
import EmployeesTable from './EmployeesTable';

/**
 * TeamTab - Team management tab with search, filters, and employee table
 * Memoized to prevent unnecessary re-renders
 */
const TeamTab = memo(({
  // Filter state
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterDepartment,
  setFilterDepartment,
  departments,
  // Table data & handlers
  loading,
  filteredSortedEmployees,
  employeeSort,
  paginatedEmployees,
  employeePage,
  employeeTotalPages,
  setEmployeePage,
  ROWS_PER_PAGE,
  // Handlers
  handleEmployeeSort,
  handleViewEmployee,
  handleResendInvitation,
  handleRoleChange,
  handleToggleStatus,
  setActionMenuOpen,
  setShowDeleteConfirm,
  setShowAddModal,
  // State
  getInitials,
  formatCurrency,
  formatCompact,
  inviteLoading,
  actionMenuOpen,
  user
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filter Bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-500">Manage employees and roles</p>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 min-w-0 sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="DISABLED">Disabled</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Department Filter */}
            <div className="relative">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
              >
                <option value="all">All Depts</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Add Employee Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-sky-600 hover:to-blue-700 transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Invite Employee
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <EmployeesTable 
        loading={loading}
        filteredSortedEmployees={filteredSortedEmployees}
        employeeSort={employeeSort}
        paginatedEmployees={paginatedEmployees}
        getInitials={getInitials}
        formatCurrency={formatCurrency}
        formatCompact={formatCompact}
        inviteLoading={inviteLoading}
        actionMenuOpen={actionMenuOpen}
        employeePage={employeePage}
        employeeTotalPages={employeeTotalPages}
        setEmployeePage={setEmployeePage}
        ROWS_PER_PAGE={ROWS_PER_PAGE}
        handleEmployeeSort={handleEmployeeSort}
        handleViewEmployee={handleViewEmployee}
        handleResendInvitation={handleResendInvitation}
        handleRoleChange={handleRoleChange}
        handleToggleStatus={handleToggleStatus}
        setActionMenuOpen={setActionMenuOpen}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setShowAddModal={setShowAddModal}
        user={user}
      />
    </div>
  );
});

TeamTab.displayName = 'TeamTab';

export default TeamTab;
