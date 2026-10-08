import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { SearchInput, ExportButton } from '../../../components/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl } from '../../../utils/formatters';
import type { ExportColumn } from '../../../utils/exportService';
import '../../../styles/portal.css';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  secondaryRoles?: string[];
  avatar?: string;
  phone?: string;
  staffId?: string;
  schoolId?: string;
  departmentId?: string;
  dept?: { id: string; name: string };
  metadata?: any;
  isLocked?: boolean;
  employeeProfile?: any;
  teacher?: {
    id: string;
    qualification?: string;
    department?: string;
    subjects?: { id: string; subject?: { id: string; name: string; code?: string } }[];
    classes?: { id: string; name: string }[];
  };
  createdAt?: string;
}

const ROLE_TABS = [
  { id: 'ALL', label: 'All Staff', icon: 'fas fa-users' },
  { id: 'TEACHER', label: 'Teachers / Faculty', icon: 'fas fa-chalkboard-teacher' },
  { id: 'BURSAR', label: 'Bursar & Finance', icon: 'fas fa-calculator' },
  { id: 'LIBRARIAN', label: 'Librarians', icon: 'fas fa-book-reader' },
  { id: 'NURSE', label: 'Health & Clinic', icon: 'fas fa-user-md' },
  { id: 'ANCILLARY', label: 'Ancillary & Support', icon: 'fas fa-tools' },
  { id: 'SCHOOL_ADMIN', label: 'Administrators', icon: 'fas fa-user-shield' }
];

export default function StaffDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoleParam = (searchParams.get('role') || 'ALL').toUpperCase();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(
    ROLE_TABS.some(t => t.id === initialRoleParam) ? initialRoleParam : 'ALL'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals & Panels
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { user: currentUser } = useAuth();
  const { showToast, toastConfirm } = useToast();

  // Synchronize URL query params when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    if (tabId === 'ALL') {
      searchParams.delete('role');
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set('role', tabId);
      setSearchParams(searchParams, { replace: true });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      showToast('Failed to load institution staff directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const depts = new Set<string>();
    users.forEach(u => {
      const dName = u.dept?.name || u.teacher?.department || (u.metadata as any)?.department;
      if (dName) depts.add(dName);
    });
    return Array.from(depts).sort();
  }, [users]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const teachers = users.filter(u => u.role === 'TEACHER').length;
    const bursar = users.filter(u => u.role === 'BURSAR').length;
    const support = users.filter(u => ['ANCILLARY', 'NURSE', 'LIBRARIAN'].includes(u.role)).length;
    const admins = users.filter(u => u.role === 'SCHOOL_ADMIN' || u.role === 'SUPER_ADMIN').length;
    return { total, teachers, bursar, support, admins };
  }, [users]);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (activeTab !== 'ALL' && u.role !== activeTab) {
        return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && u.isLocked) return false;
      if (statusFilter === 'LOCKED' && !u.isLocked) return false;

      // Department filter
      if (departmentFilter !== 'ALL') {
        const dName = u.dept?.name || u.teacher?.department || (u.metadata as any)?.department;
        if (dName !== departmentFilter) return false;
      }

      // Search term
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const staffId = (u.staffId || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const secRoles = (u.secondaryRoles || []).join(' ').toLowerCase();
        const dept = (u.dept?.name || u.teacher?.department || '').toLowerCase();
        
        if (
          !name.includes(query) &&
          !email.includes(query) &&
          !staffId.includes(query) &&
          !phone.includes(query) &&
          !role.includes(query) &&
          !secRoles.includes(query) &&
          !dept.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [users, activeTab, statusFilter, departmentFilter, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handleResetPassword = async (user: StaffUser) => {
    if (!user.id) return;
    const confirmed = await toastConfirm(`Reset password for ${user.name} (${user.email}) to default "Password"?`);
    if (!confirmed) return;
    try {
      await api.post(`/api/users/${user.id}/reset-password`);
      showToast(`Password for ${user.name} reset successfully`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to reset password', 'error');
    }
  };

  const handleLockToggle = async (user: StaffUser) => {
    if (!user.id) return;
    const action = user.isLocked ? 'unlock' : 'lock';
    const confirmed = await toastConfirm(`Are you sure you want to ${action} account for ${user.name}?`);
    if (!confirmed) return;
    try {
      await api.post(`/api/users/${user.id}/${action}`);
      showToast(`Account for ${user.name} ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchStaff();
    } catch (err: any) {
      showToast(err?.response?.data?.error || `Failed to ${action} account`, 'error');
    }
  };

  const openDetail = (user: StaffUser) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };

  const openEdit = (user: StaffUser) => {
    setActiveUserForEdit({
      ...user,
      department: user.dept?.name || user.teacher?.department || (user.metadata as any)?.department,
      qualification: user.teacher?.qualification || (user.metadata as any)?.qualification
    });
    setIsEditModalOpen(true);
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Staff ID', key: 'staffId' },
    { header: 'Full Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Primary Role', key: 'role' },
    { 
      header: 'Department', 
      key: 'dept', 
      formatter: (_val: any, row: any) => row.dept?.name || row.teacher?.department || row.metadata?.department || '-' 
    },
    { 
      header: 'Secondary Roles', 
      key: 'secondaryRoles', 
      formatter: (val: any) => Array.isArray(val) ? val.join(', ') : '-' 
    },
    { 
      header: 'Status', 
      key: 'isLocked', 
      formatter: (val: any) => val ? 'Locked' : 'Active' 
    }
  ];

  const detailSections = useMemo(() => {
    if (!selectedUser) return [];
    const meta = (selectedUser.metadata as Record<string, any>) || {};
    const emp = (selectedUser.employeeProfile as Record<string, any>) || {};
    const teacher = selectedUser.teacher;

    const generalFields: any[] = [
      { label: 'Full Name', value: selectedUser.name },
      { label: 'Staff ID / Payroll #', value: selectedUser.staffId || 'Not set' },
      { label: 'Email Address', value: selectedUser.email },
      { label: 'Phone Number', value: selectedUser.phone || 'Not set' },
      { label: 'Primary System Role', value: selectedUser.role },
      { label: 'Department', value: selectedUser.dept?.name || teacher?.department || meta.department || 'General' },
      { label: 'Account Status', value: selectedUser.isLocked ? 'Locked' : 'Active' }
    ];

    const hrFields: any[] = [
      { label: 'Job Title / Position', value: emp.jobTitle || meta.jobTitle || meta.designation || 'Staff Member' },
      { label: 'Employment Type', value: emp.employmentType || meta.employmentType || 'Full-time' },
      { label: 'Qualifications', value: teacher?.qualification || emp.qualification || meta.qualification || 'N/A' },
      { label: 'National ID', value: emp.nationalId || meta.nationalId || 'N/A' },
      { label: 'Date Joined', value: emp.dateJoined || meta.dateJoined || (selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A') }
    ];

    const sections = [
      { title: 'Core Profile', fields: generalFields },
      { title: 'HR & Employment Details', fields: hrFields }
    ];

    if (selectedUser.role === 'TEACHER' && teacher) {
      const subjectList = (teacher.subjects || []).map((s: any) => s.subject?.name || s.name).filter(Boolean).join(', ') || 'None assigned';
      const classList = (teacher.classes || []).map((c: any) => c.name).filter(Boolean).join(', ') || 'None assigned';
      sections.push({
        title: 'Academic Teaching Allocations',
        fields: [
          { label: 'Assigned Subjects', value: subjectList },
          { label: 'Assigned Classes', value: classList }
        ]
      });
    }

    return sections;
  }, [selectedUser]);

  return (
    <div className="portal-page-container">
      {/* Header */}
      <div className="portal-page-header">
        <div className="portal-page-header-content">
          <div className="portal-header-icon-badge">
            <i className="fas fa-id-badge text-primary"></i>
          </div>
          <div>
            <h1>Staff Directory</h1>
            <p className="portal-page-subtitle">
              Unified institutional personnel register: academic faculty, administrative bursars, librarians, health staff, and support teams.
            </p>
          </div>
        </div>

        <div className="portal-header-actions">
          <ExportButton
            data={filteredUsers}
            columns={exportColumns}
            filename={`Staff_Directory_${activeTab}_${new Date().toISOString().split('T')[0]}`}
            className="btn btn-outline"
          />
          <button 
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <i className="fas fa-user-plus mr-2"></i> Add Staff Member
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="portal-metrics-grid mb-6">
        <div className="metric-card">
          <div className="metric-icon-wrap bg-blue-50 text-blue-600">
            <i className="fas fa-users"></i>
          </div>
          <div>
            <div className="metric-value">{stats.total}</div>
            <div className="metric-label">Total Staff</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap bg-emerald-50 text-emerald-600">
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div>
            <div className="metric-value">{stats.teachers}</div>
            <div className="metric-label">Teaching Faculty</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap bg-amber-50 text-amber-600">
            <i className="fas fa-calculator"></i>
          </div>
          <div>
            <div className="metric-value">{stats.bursar}</div>
            <div className="metric-label">Bursary & Finance</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap bg-purple-50 text-purple-600">
            <i className="fas fa-tools"></i>
          </div>
          <div>
            <div className="metric-value">{stats.support}</div>
            <div className="metric-label">Support & Health</div>
          </div>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div className="portal-tabs-wrapper mb-6">
        <div className="portal-tabs-nav">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.id}
              className={`portal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.label}
              <span className="portal-tab-count">
                {tab.id === 'ALL' 
                  ? users.length 
                  : users.filter(u => u.role === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="portal-card mb-6">
        <div className="portal-filter-bar">
          <div className="flex-1 min-w-[280px]">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, email, staff ID, department..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Department:</label>
              <select
                className="portal-select text-sm py-1.5"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Status:</label>
              <select
                className="portal-select text-sm py-1.5"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="LOCKED">Locked Accounts</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Register Table */}
      <div className="portal-card">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <i className="fas fa-circle-notch fa-spin text-3xl mb-3 text-primary"></i>
            <p>Loading staff directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <i className="fas fa-user-slash text-4xl mb-3"></i>
            <h3 className="text-lg font-semibold text-slate-700">No staff members found</h3>
            <p className="text-sm mt-1">Try adjusting your role tab, department filter, or search query.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="portal-table w-full">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Staff ID</th>
                    <th>Role & Duties</th>
                    <th>Department</th>
                    <th>Specialty / Allocations</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((member) => {
                    const deptName = member.dept?.name || member.teacher?.department || (member.metadata as any)?.department || '—';
                    const hasSecRoles = Array.isArray(member.secondaryRoles) && member.secondaryRoles.length > 0;
                    const teacher = member.teacher;
                    const subjectCount = teacher?.subjects?.length || 0;
                    const classCount = teacher?.classes?.length || 0;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                        <td>
                          <div className="flex items-center gap-3">
                            <img
                              src={getAvatarUrl(member.avatar) || ''}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-semibold text-slate-800">{member.name}</div>
                              <div className="text-xs text-slate-500">{member.email}</div>
                              {member.phone && (
                                <div className="text-xs text-slate-400">{member.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="font-mono text-xs px-2 py-1 bg-slate-100 rounded text-slate-700 border border-slate-200">
                            {member.staffId || '—'}
                          </span>
                        </td>

                        <td>
                          <div className="flex flex-col gap-1 items-start">
                            <span className="badge badge-primary text-xs font-semibold">
                              {member.role.replace('_', ' ')}
                            </span>
                            {hasSecRoles && (
                              <div className="flex flex-wrap gap-1">
                                {member.secondaryRoles!.map(sr => (
                                  <span key={sr} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium">
                                    {sr}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="text-sm text-slate-700 font-medium">
                            {deptName}
                          </span>
                        </td>

                        <td>
                          {member.role === 'TEACHER' ? (
                            <div className="text-xs text-slate-600">
                              {subjectCount > 0 ? (
                                <div>
                                  <span className="font-medium text-slate-800">{subjectCount} Subjects</span>
                                  {classCount > 0 && <span className="text-slate-400"> • {classCount} Classes</span>}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No allocations</span>
                              )}
                              {teacher?.qualification && (
                                <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                  {teacher.qualification}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {(member.employeeProfile as any)?.jobTitle || (member.metadata as any)?.jobTitle || 'Standard Staff'}
                            </span>
                          )}
                        </td>

                        <td>
                          {member.isLocked ? (
                            <span className="badge badge-danger text-xs font-semibold">
                              <i className="fas fa-lock mr-1"></i> Locked
                            </span>
                          ) : (
                            <span className="badge badge-success text-xs font-semibold">
                              <i className="fas fa-check-circle mr-1"></i> Active
                            </span>
                          )}
                        </td>

                        <td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetail(member)}
                              className="btn btn-sm btn-ghost text-slate-600 hover:text-slate-900"
                              title="View Full Profile"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              onClick={() => openEdit(member)}
                              className="btn btn-sm btn-ghost text-primary hover:bg-primary/10"
                              title="Edit Staff Member"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleResetPassword(member)}
                              className="btn btn-sm btn-ghost text-amber-600 hover:bg-amber-50"
                              title="Reset Password"
                            >
                              <i className="fas fa-key"></i>
                            </button>
                            <button
                              onClick={() => handleLockToggle(member)}
                              className={`btn btn-sm btn-ghost ${member.isLocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}`}
                              title={member.isLocked ? 'Unlock Account' : 'Lock Account'}
                            >
                              <i className={`fas ${member.isLocked ? 'fa-unlock' : 'fa-lock'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="portal-pagination-footer flex items-center justify-between p-4 border-t border-slate-200">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} staff members
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <div className="flex items-center px-2 text-sm text-slate-600 font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Slideout */}
      {selectedUser && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedUser.name}
          subTitle={selectedUser.staffId || selectedUser.email}
          avatarText={selectedUser.name?.charAt(0) || 'U'}
          avatarUrl={getAvatarUrl(selectedUser.avatar) || undefined}
          role={selectedUser.role}
          secondaryRoles={selectedUser.secondaryRoles}
          sections={detailSections}
          onEdit={() => {
            setIsDetailOpen(false);
            openEdit(selectedUser);
          }}
          onResetPassword={() => {
            handleResetPassword(selectedUser);
          }}
        />
      )}

      {/* Edit Modal */}
      {activeUserForEdit && (
        <UserEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setActiveUserForEdit(null);
          }}
          user={activeUserForEdit}
          currentUserRole={currentUser?.role || 'SCHOOL_ADMIN'}
          onSuccess={() => {
            fetchStaff();
            setIsEditModalOpen(false);
            setActiveUserForEdit(null);
          }}
        />
      )}

      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchStaff();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
