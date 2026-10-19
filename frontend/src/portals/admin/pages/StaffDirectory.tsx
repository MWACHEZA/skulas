import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { SearchInput, ExportButton, DataImportModal, SkeletonLoader } from '../../../components/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl, parseCleanBadges } from '../../../utils/formatters';
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { user: currentUser } = useAuth();
  const { showToast, toastConfirm } = useToast();

  // Synchronize URL query params when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setIsMoreOpen(false);
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
      const { data } = await api.get('/api/users?staffOnly=true');
      const rawList = Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : [];
      // Strictly exclude any students, parents, or suppliers
      const staffOnly = rawList.filter((u: any) => !['STUDENT', 'PARENT', 'SUPPLIER'].includes(u.role));
      setUsers(staffOnly);
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
    const staffOnly = users.filter(u => !['STUDENT', 'PARENT', 'SUPPLIER'].includes(u.role));
    const total = staffOnly.length;
    const teachers = staffOnly.filter(u => u.role === 'TEACHER').length;
    const bursar = staffOnly.filter(u => u.role === 'BURSAR').length;
    const support = staffOnly.filter(u => ['ANCILLARY', 'NURSE', 'LIBRARIAN'].includes(u.role)).length;
    const admins = staffOnly.filter(u => u.role === 'SCHOOL_ADMIN' || u.role === 'SUPER_ADMIN').length;
    return { total, teachers, bursar, support, admins };
  }, [users]);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Strictly exclude non-staff roles
      if (['STUDENT', 'PARENT', 'SUPPLIER'].includes(u.role)) {
        return false;
      }

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
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <i className="fas fa-id-badge" style={{ color: 'var(--school-primary, #0284c7)' }}></i>
            Staff Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: 4, margin: 0 }}>
            Unified institutional personnel register: academic faculty, administrative bursars, librarians, health staff, and support teams.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ExportButton
            data={filteredUsers}
            columns={exportColumns}
            filename={`Staff_Directory_${activeTab}_${new Date().toISOString().split('T')[0]}`}
            className="portal-btn-secondary"
          />
          <button 
            className="portal-btn-secondary"
            onClick={() => setIsImportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, borderRadius: 8, fontWeight: 700, padding: '0 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', cursor: 'pointer' }}
          >
            <i className="fas fa-file-import" style={{ color: '#0284c7' }}></i> Bulk Import Staff
          </button>
          <button 
            className="portal-btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, borderRadius: 8, fontWeight: 800, padding: '0 20px', background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <i className="fas fa-user-plus"></i> Add Staff Member
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
            <i className="fas fa-users"></i>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{stats.total}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}>Total Staff</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{stats.teachers}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}>Teaching Faculty</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
            <i className="fas fa-calculator"></i>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{stats.bursar}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}>Bursary & Finance</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
            <i className="fas fa-tools"></i>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{stats.support}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}>Support & Health</div>
          </div>
        </div>
      </div>

      {/* Role Navigation Tabs (Responsive with More... dropdown) */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 20,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '12px 12px 0 0',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          position: 'relative'
        }}
      >
        {ROLE_TABS.slice(0, 4).map(tab => {
          const count = tab.id === 'ALL' 
            ? users.length 
            : users.filter(u => u.role === tab.id).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0284c7' : '#64748b',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                marginBottom: '-2px',
                fontSize: '0.92rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <i className={tab.icon} style={{ fontSize: '0.95rem' }}></i>
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: isActive ? '#e0f2fe' : '#f1f5f9',
                  color: isActive ? '#0369a1' : '#64748b',
                  marginLeft: 2
                }}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* More Roles Dropdown Menu */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          {(() => {
            const moreTabs = ROLE_TABS.slice(4);
            const activeMoreTab = moreTabs.find(t => t.id === activeTab);
            const isMoreActive = Boolean(activeMoreTab);

            return (
              <>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    border: 'none',
                    background: isMoreActive ? '#f0f9ff' : 'none',
                    cursor: 'pointer',
                    fontWeight: isMoreActive ? 700 : 600,
                    color: isMoreActive ? '#0284c7' : '#475569',
                    borderBottom: isMoreActive ? '3px solid #0284c7' : '3px solid transparent',
                    marginBottom: '-2px',
                    borderRadius: '6px 6px 0 0',
                    fontSize: '0.92rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  title="View more staff roles"
                >
                  <i className="fas fa-layer-group" style={{ fontSize: '0.95rem' }}></i>
                  <span>{activeMoreTab ? activeMoreTab.label : 'More Roles'}</span>
                  {activeMoreTab && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: '#e0f2fe',
                        color: '#0369a1'
                      }}
                    >
                      {users.filter(u => u.role === activeMoreTab.id).length}
                    </span>
                  )}
                  <i className={`fas fa-chevron-${isMoreOpen ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', marginLeft: 2 }}></i>
                </button>

                {isMoreOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      background: '#fff',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                      zIndex: 30,
                      minWidth: 230,
                      padding: 6,
                      marginTop: 4
                    }}
                  >
                    <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Additional Roles
                    </div>
                    {moreTabs.map(tab => {
                      const count = users.filter(u => u.role === tab.id).length;
                      const isTabActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleTabChange(tab.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            border: 'none',
                            background: isTabActive ? '#eff6ff' : 'transparent',
                            color: isTabActive ? '#1d4ed8' : '#334155',
                            fontWeight: isTabActive ? 700 : 500,
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            textAlign: 'left',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            if (!isTabActive) (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                          }}
                          onMouseLeave={e => {
                            if (!isTabActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={tab.icon} style={{ width: 16, textAlign: 'center', color: isTabActive ? '#2563eb' : '#64748b' }}></i>
                            {tab.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: isTabActive ? '#dbeafe' : '#f1f5f9', color: isTabActive ? '#1e40af' : '#64748b' }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="portal-card"
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 300px', maxWidth: 460 }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              loading={loading}
              placeholder="Search by name, email, staff ID, department..."
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Department:</label>
              <select
                className="portal-input"
                style={{ minWidth: 160, padding: '7px 12px', fontSize: '0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Status:</label>
              <select
                className="portal-input"
                style={{ minWidth: 130, padding: '7px 12px', fontSize: '0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
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

            {(searchTerm || departmentFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                onClick={() => {
                  setSearchTerm('');
                  setDepartmentFilter('ALL');
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-times mr-1" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff Register Table */}
      <div
        className="portal-card"
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {loading ? (
          <div style={{ padding: '16px' }}>
            <SkeletonLoader type="table" rows={8} columns={7} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', marginBottom: 12, color: '#cbd5e1' }}></i>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>No staff members found</h3>
            <p style={{ fontSize: '0.88rem', margin: 0 }}>Try adjusting your role tab, department filter, or search query.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', position: 'relative' }}>
              <table className="portal-table" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Member</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role & Duties</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specialty / Allocations</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', right: 0, background: '#f8fafc', zIndex: 3, boxShadow: '-3px 0 6px rgba(0,0,0,0.04)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((member) => {
                    const deptName = member.dept?.name || member.teacher?.department || (member.metadata as any)?.department || '—';
                    const cleanSecRoles = parseCleanBadges(member.secondaryRoles);
                    const teacher = member.teacher;
                    const subjectCount = teacher?.subjects?.length || 0;
                    const classCount = teacher?.classes?.length || 0;
                    const avatarUrl = getAvatarUrl(member.avatar);

                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={member.name}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>
                                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>{member.name}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.email}</div>
                              {member.phone && (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{member.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', padding: '3px 8px', background: '#f1f5f9', borderRadius: 4, color: '#334155', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                            {member.staffId || '—'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                              {member.role.replace('_', ' ')}
                            </span>
                            {cleanSecRoles.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {cleanSecRoles.map(sr => (
                                  <span key={sr} style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 4, padding: '2px 6px', fontSize: '0.65rem', fontWeight: 600 }}>
                                    {sr}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                            {deptName}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {member.role === 'TEACHER' ? (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              {subjectCount > 0 ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{subjectCount} Subjects</span>
                                  {classCount > 0 && <span style={{ color: '#94a3b8' }}> • {classCount} Classes</span>}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No allocations</span>
                              )}
                              {teacher?.qualification && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                  {teacher.qualification}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {(member.employeeProfile as any)?.jobTitle || (member.metadata as any)?.jobTitle || 'Standard Staff'}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {member.isLocked ? (
                            <span style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-lock"></i> Locked
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-check-circle"></i> Active
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right', position: 'sticky', right: 0, background: '#fff', zIndex: 2, boxShadow: '-3px 0 6px rgba(0,0,0,0.04)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => openDetail(member)}
                              style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              title="View Full Profile"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              onClick={() => openEdit(member)}
                              style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit Staff Member"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleResetPassword(member)}
                              style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #fef3c7', background: '#fffbeb', color: '#d97706', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Reset Password"
                            >
                              <i className="fas fa-key"></i>
                            </button>
                            <button
                              onClick={() => handleLockToggle(member)}
                              style={{ width: 32, height: 32, borderRadius: 6, border: member.isLocked ? '1px solid #bbf7d0' : '1px solid #fecaca', background: member.isLocked ? '#f0fdf4' : '#fef2f2', color: member.isLocked ? '#16a34a' : '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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

            {/* Pagination Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} staff members
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: currentPage <= 1 ? '#94a3b8' : '#334155', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: currentPage >= totalPages ? '#94a3b8' : '#334155', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
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

      {/* Bulk Import Staff Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchStaff();
          setIsImportModalOpen(false);
        }}
        title="Bulk Import Staff Accounts"
        templateUrl="/api/users/template"
        importUrl="/api/users/import"
        templateFilename="staff_import_template.xlsx"
        entityName="staff members"
        description="Upload an Excel (.xlsx/.xls) or CSV file to bulk import teaching faculty, bursars, librarians, and support staff. Accounts are initialized with secure credentials."
      />
    </div>
  );
}
