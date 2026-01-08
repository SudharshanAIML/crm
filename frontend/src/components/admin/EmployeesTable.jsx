import { Search, Send, Eye, MoreVertical, Users, UserPlus, RefreshCw, ShieldCheck, Shield, UserCheck, UserX, Trash2 } from 'lucide-react';
import { Pagination, SortIcon, getInvitationStatusBadge } from '../admin';

const EmployeesTable = ({
  loading,
  filteredSortedEmployees,
  employeeSort,
  paginatedEmployees,
  getInitials,
  formatCurrency,
  formatCompact,
  inviteLoading,
  actionMenuOpen,
  employeePage,
  employeeTotalPages,
  setEmployeePage,
  ROWS_PER_PAGE,
  // Event handlers
  handleEmployeeSort,
  handleViewEmployee,
  handleResendInvitation,
  handleRoleChange,
  handleToggleStatus,
  setActionMenuOpen,
  setShowDeleteConfirm,
  setShowAddModal,
  // User context
  user
}) => {
    return (
      <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
          ) : filteredSortedEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No employees found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sky-600 hover:bg-sky-50 rounded-lg font-medium text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add your first employee
              </button>
            </div>  
          ) : (
            <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th 
                    onClick={() => handleEmployeeSort('name')}
                    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      Employee
                      <SortIcon column="name" currentSort={employeeSort} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleEmployeeSort('invitation_status')}
                    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <SortIcon column="invitation_status" currentSort={employeeSort} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleEmployeeSort('department')}
                    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      Department
                      <SortIcon column="department" currentSort={employeeSort} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleEmployeeSort('contactsHandled')}
                    className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Leads
                      <SortIcon column="contactsHandled" currentSort={employeeSort} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleEmployeeSort('dealsClosed')}
                    className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Deals
                      <SortIcon column="dealsClosed" currentSort={employeeSort} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleEmployeeSort('totalRevenue')}
                    className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Revenue
                      <SortIcon column="totalRevenue" currentSort={employeeSort} />
                    </div>
                  </th>
                  <th className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEmployees.map((employee) => (
                  <tr key={employee.emp_id} className={`hover:bg-gray-50 transition-colors ${employee.invitation_status === 'DISABLED' ? 'opacity-60' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          employee.invitation_status === 'DISABLED'
                            ? 'bg-gray-400'
                            : employee.role === 'ADMIN' 
                              ? 'bg-gradient-to-br from-amber-400 to-orange-600' 
                              : 'bg-gradient-to-br from-sky-400 to-blue-600'
                        }`}>
                          {getInitials(employee.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getInvitationStatusBadge(employee.invitation_status)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                        {employee.department || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <p className="text-sm font-bold text-purple-600">{parseInt(employee.contactsHandled) || 0}</p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <p className="text-sm font-bold text-emerald-600">{parseInt(employee.dealsClosed) || 0}</p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <p 
                        className="text-sm font-bold text-amber-600 cursor-help"
                        title={formatCurrency(parseFloat(employee.totalRevenue) || 0, { compact: false })}
                      >
                        {formatCompact(parseFloat(employee.totalRevenue) || 0)}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {employee.invitation_status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleViewEmployee(employee)}
                            className="p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Resend Invite Button for INVITED status */}
                        {employee.invitation_status === 'INVITED' && (
                          <button 
                            onClick={() => handleResendInvitation(employee.emp_id)}
                            disabled={inviteLoading === employee.emp_id}
                            className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Resend Invitation"
                          >
                            {inviteLoading === employee.emp_id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        {/* Actions Menu */}
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(actionMenuOpen === employee.emp_id ? null : employee.emp_id);
                            }}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {actionMenuOpen === employee.emp_id && (
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                              {/* Role change options */}
                              {employee.invitation_status === 'ACTIVE' && (
                                <>
                                  {employee.role === 'EMPLOYEE' ? (
                                    <button
                                      onClick={() => handleRoleChange(employee.emp_id, 'ADMIN')}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                                      Promote to Admin
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRoleChange(employee.emp_id, 'EMPLOYEE')}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      disabled={employee.emp_id === user?.emp_id}
                                    >
                                      <Shield className="w-4 h-4 text-sky-500" />
                                      Demote to Employee
                                    </button>
                                  )}
                                  <hr className="my-1 border-gray-100" />
                                </>
                              )}
                              
                              {/* Enable/Disable option */}
                              {employee.emp_id !== user?.emp_id && (
                                <>
                                  {employee.invitation_status === 'DISABLED' ? (
                                    <button
                                      onClick={() => handleToggleStatus(employee.emp_id, 'DISABLED')}
                                      className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                    >
                                      <UserCheck className="w-4 h-4" />
                                      Enable Account
                                    </button>
                                  ) : employee.invitation_status === 'ACTIVE' ? (
                                    <button
                                      onClick={() => handleToggleStatus(employee.emp_id, 'ACTIVE')}
                                      className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                    >
                                      <UserX className="w-4 h-4" />
                                      Disable Account
                                    </button>
                                  ) : null}
                                  <hr className="my-1 border-gray-100" />
                                </>
                              )}
                              
                              {/* Resend invite for INVITED */}
                              {employee.invitation_status === 'INVITED' && (
                                <>
                                  <button
                                    onClick={() => handleResendInvitation(employee.emp_id)}
                                    disabled={inviteLoading === employee.emp_id}
                                    className="w-full px-4 py-2 text-left text-sm text-sky-600 hover:bg-sky-50 flex items-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    Resend Invitation
                                  </button>
                                  <hr className="my-1 border-gray-100" />
                                </>
                              )}
                              
                              {/* Remove employee */}
                              <button
                                onClick={() => {
                                  setActionMenuOpen(null);
                                  setShowDeleteConfirm(employee);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                disabled={employee.emp_id === user?.emp_id}
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove Employee
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Employee Pagination */}
            <Pagination
              currentPage={employeePage}
              totalPages={employeeTotalPages}
              totalItems={filteredSortedEmployees.length}
              onPageChange={setEmployeePage}
              itemName="employees"
              ROWS_PER_PAGE={ROWS_PER_PAGE}
            />
          </>
          )}
        </div>
    );
}
export default EmployeesTable;