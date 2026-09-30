import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl, formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

export default function AdminStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBursar = location.pathname.startsWith('/bursar');
  const baseStudentsUrl = isBursar ? '/bursar/students' : '/admin/students';

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Debounce
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('');
  const [selectedBoarding, setSelectedBoarding] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [leadersOnly, setLeadersOnly] = useState(false);

  // Toggleable leader column (visible by default)
  const [showLeaderColumn, setShowLeaderColumn] = useState(true);

  // Filter options loaded dynamically
  const [classList, setClassList] = useState<{ id: string; name: string; level: string }[]>([]);
  const [hostelList, setHostelList] = useState<{ id: string; name: string }[]>([]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast, toastConfirm } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // 300ms search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load filter options on mount
  useEffect(() => {
    fetchFilterOptions();
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setIsCreateModalOpen(true);
    }
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [classRes, hostelRes] = await Promise.allSettled([
        api.get('/api/classes'),
        api.get('/api/ancillary/hostels')
      ]);

      if (classRes.status === 'fulfilled' && Array.isArray(classRes.value.data)) {
        setClassList(classRes.value.data);
      }
      if (hostelRes.status === 'fulfilled' && Array.isArray(hostelRes.value.data)) {
        setHostelList(hostelRes.value.data);
      }
    } catch {
      // Non-blocking fallback
    }
  };

  // Re-fetch when debounced search or primary server filters change
  useEffect(() => {
    fetchStudents();
  }, [debouncedSearch, selectedClass, selectedStatus, selectedBoarding, selectedGender, selectedHostel, leadersOnly]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: '100',
        search: debouncedSearch,
        leadersOnly: leadersOnly ? 'true' : 'false'
      };

      if (selectedClass) params.classId = selectedClass;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedBoarding) params.boardingStatus = selectedBoarding;
      if (selectedGender) params.gender = selectedGender;
      if (selectedHostel) params.hostelId = selectedHostel;

      const { data } = await api.get('/api/students', { params });
      setStudents(data.students || []);
    } catch (err) {
      showToast('Failed to fetch students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: any) => {
    const confirmed = toastConfirm ? await toastConfirm(`Are you sure you want to permanently delete ${user.name}? This action cannot be undone.`) : window.confirm(`Are you sure you want to permanently delete ${user.name}?`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/students/${user.id}`);
      showToast('Student record deleted successfully', 'success');
      fetchStudents();
    } catch {
      showToast('Failed to delete student', 'error');
    }
  };

  const handleResetPassword = async (user: any) => {
    const userId = user.userId || user.user?.id || user.id;
    const confirmed = toastConfirm ? await toastConfirm(`Reset password for ${user.name} to default "Password"?`) : window.confirm(`Reset password for ${user.name} to default "Password"?`);
    if (!confirmed) return;
    try {
      await api.post(`/api/users/${userId}/reset-password`);
      showToast('Password reset successfully', 'success');
    } catch {
      showToast('Failed to reset password', 'error');
    }
  };

  const handleLockToggle = async (user: any) => {
    const userId = user.userId || user.user?.id || user.id;
    const action = user.user?.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${userId}/${action}`);
      showToast(`Account ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchStudents();
    } catch {
      showToast(`Failed to ${action} account`, 'error');
    }
  };

  const openDetail = (student: any) => {
    navigate(`${baseStudentsUrl}/${student.id}`);
  };

  const openEdit = (student: any) => {
    const userData = {
      ...student.user,
      id: student.user?.id || student.userId,
      role: student.user?.role || 'STUDENT',
      staffId: student.user?.staffId || student.studentId,
      studentId: student.studentId,
      classId: student.classId,
      status: student.status,
      nationalId: student.nationalId
    };
    setActiveUserForEdit(userData);
    setIsEditModalOpen(true);
  };

  // Helper to compute fee aging status
  const getStudentFeeAging = (s: any) => {
    const fees = Array.isArray(s.fees) ? s.fees : [];
    if (fees.length === 0) return 'PAID';
    const totalBilled = fees.reduce((acc: number, f: any) => acc + (f.amount || 0), 0);
    const totalPaid = fees.reduce((acc: number, f: any) => acc + (f.paid || 0), 0);
    const balance = totalBilled - totalPaid;
    if (balance <= 0) return 'PAID';

    const now = new Date().getTime();
    let maxOverdueDays = 0;
    for (const f of fees) {
      const feeBal = (f.amount || 0) - (f.paid || 0);
      if (feeBal > 0 && f.dueDate) {
        const dueTime = new Date(f.dueDate).getTime();
        const diffDays = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));
        if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
      }
    }

    if (maxOverdueDays > 90) return 'OWING_90';
    if (maxOverdueDays > 60) return 'OWING_60';
    if (maxOverdueDays > 30) return 'OWING_30';
    if (totalPaid > 0) return 'PARTIAL';
    return 'OWING_30';
  };

  // Combined client-side filtering (handles local fee aging, route, and search guarantees)
  const filteredStudents = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return students.filter(s => {
      // 1. Partial, case-insensitive match prioritizing STN, Name, National ID, Phone, Email
      if (q) {
        const stn = (s.studentId || '').toLowerCase();
        const name = (s.user?.name || s.name || '').toLowerCase();
        const natId = (s.nationalId || '').toLowerCase();
        const adm = (s.admissionNumber || '').toLowerCase();
        const phone = (s.user?.phone || s.phone || '').toLowerCase();
        const email = (s.user?.email || s.email || '').toLowerCase();

        const match = stn.includes(q) || name.includes(q) || natId.includes(q) || adm.includes(q) || phone.includes(q) || email.includes(q);
        if (!match) return false;
      }

      // 2. Class
      if (selectedClass && s.classId !== selectedClass && s.class?.id !== selectedClass) {
        return false;
      }

      // 3. Status
      if (selectedStatus && s.status !== selectedStatus) {
        return false;
      }

      // 4. Boarding
      if (selectedBoarding && s.boardingStatus !== selectedBoarding) {
        return false;
      }

      // 5. Gender
      if (selectedGender && s.gender !== selectedGender) {
        return false;
      }

      // 6. Hostel / Dorm
      if (selectedHostel && s.hostelId !== selectedHostel && s.hostel?.id !== selectedHostel) {
        return false;
      }

      // 7. Route (Assigned vs Unassigned)
      if (selectedRoute) {
        const hasRoute = Boolean(s.transportRoute || s.route || s.transport || s.user?.metadata?.routeId);
        if (selectedRoute === 'ASSIGNED' && !hasRoute) return false;
        if (selectedRoute === 'UNASSIGNED' && hasRoute) return false;
      }

      // 8. Fee Status (Debtors Aging buckets)
      if (selectedFeeStatus) {
        const aging = getStudentFeeAging(s);
        if (selectedFeeStatus === 'PAID' && aging !== 'PAID') return false;
        if (selectedFeeStatus === 'PARTIAL' && aging !== 'PARTIAL') return false;
        if (selectedFeeStatus === 'OWING_30' && aging !== 'OWING_30') return false;
        if (selectedFeeStatus === 'OWING_60' && aging !== 'OWING_60') return false;
        if (selectedFeeStatus === 'OWING_90' && aging !== 'OWING_90') return false;
      }

      // 9. Leaders Only
      if (leadersOnly && (!Array.isArray(s.leadershipAssignments) || s.leadershipAssignments.length === 0)) {
        return false;
      }

      return true;
    });
  }, [students, debouncedSearch, selectedClass, selectedStatus, selectedBoarding, selectedGender, selectedHostel, selectedRoute, selectedFeeStatus, leadersOnly]);

  const hasActiveFilters = Boolean(
    searchInput || selectedClass || selectedStatus || selectedFeeStatus || 
    selectedBoarding || selectedGender || selectedHostel || selectedRoute || leadersOnly
  );

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedClass('');
    setSelectedStatus('');
    setSelectedFeeStatus('');
    setSelectedBoarding('');
    setSelectedGender('');
    setSelectedHostel('');
    setSelectedRoute('');
    setLeadersOnly(false);
    setCurrentPage(1);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Student Management</h1>
        <p>View, search, filter, and manage school student profiles, enrollment, and credentials.</p>
      </div>

      <div className="portal-card" style={{ marginBottom: '24px' }}>
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: '280px', maxWidth: '480px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search by STN, Name, National ID, Phone, Email..." 
              className="portal-input"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px', paddingRight: searchInput ? '36px' : '12px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }}></i>
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* Toggle switch for Leader column */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={showLeaderColumn}
                onChange={e => setShowLeaderColumn(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <i className="fas fa-columns" style={{ color: '#64748b' }}></i>
              Leader Column
            </label>

            {/* Leaders Only Quick Filter */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: leadersOnly ? '#2563eb' : '#475569', background: leadersOnly ? '#eff6ff' : '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: leadersOnly ? '1px solid #93c5fd' : '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={leadersOnly}
                onChange={e => { setLeadersOnly(e.target.checked); setCurrentPage(1); }}
                style={{ cursor: 'pointer' }}
              />
              <i className="fas fa-award" style={{ color: leadersOnly ? '#2563eb' : '#d97706' }}></i>
              Leaders Only
            </label>

            <button 
              className="portal-btn-primary" 
              onClick={() => setIsCreateModalOpen(true)} 
              style={{ padding: '0 24px', fontWeight: 800, height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-user-plus"></i> New Student
            </button>
          </div>
        </div>

        {/* Combinable Filters Bar */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <i className="fas fa-filter mr-1" style={{ color: '#2563eb' }}></i> Refine Directory Filters
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <i className="fas fa-undo"></i> Reset All Filters
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {/* Class Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Class / Form</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Classes</option>
                {classList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="Enrolled">Active / Enrolled</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>

            {/* Fee Status (Debtors Aging Buckets) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Fee Status</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedFeeStatus}
                onChange={e => { setSelectedFeeStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Fee Statuses</option>
                <option value="PAID">Paid in Full</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="OWING_30">Owing (0-30 Days)</option>
                <option value="OWING_60">Owing (31-60 Days)</option>
                <option value="OWING_90">Owing (61-90+ Days)</option>
              </select>
            </div>

            {/* Boarding Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Boarding</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedBoarding}
                onChange={e => { setSelectedBoarding(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Students</option>
                <option value="Day">Day Student</option>
                <option value="Boarder">Boarder</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gender</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedGender}
                onChange={e => { setSelectedGender(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Dorm / Hostel */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Dorm / Hostel</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedHostel}
                onChange={e => { setSelectedHostel(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Hostels</option>
                {hostelList.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Transit Route */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Bus Route</label>
              <select
                className="portal-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedRoute}
                onChange={e => { setSelectedRoute(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Transport</option>
                <option value="ASSIGNED">Assigned to Route</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.85rem', color: '#64748b' }}>
          <span>
            Found <strong>{filteredStudents.length}</strong> matching students
            {debouncedSearch && <span> for &ldquo;<strong>{debouncedSearch}</strong>&rdquo;</span>}
          </span>
          {filteredStudents.length > itemsPerPage && (
            <span>
              Page {currentPage} of {Math.ceil(filteredStudents.length / itemsPerPage)}
            </span>
          )}
        </div>
        
        {/* Table View */}
        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)', marginBottom: 12 }}></i>
              <p style={{ color: '#64748b', fontWeight: 600 }}>Loading students directory...</p>
            </div>
          ) : (
            <>
            <table className="management-table">
              <thead>
                <tr>
                  <th>Student ID (STN)</th>
                  <th>Name & Profile</th>
                  <th>Class</th>
                  {showLeaderColumn && <th>Leader Role</th>}
                  <th>Boarding / Hostel</th>
                  <th>Phone / Email</th>
                  <th>Fee Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const safeFiltered = Array.isArray(filteredStudents) ? filteredStudents : [];
                  if (safeFiltered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={showLeaderColumn ? 9 : 8} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                          <i className="fas fa-user-slash fa-2x" style={{ color: '#cbd5e1', marginBottom: 12, display: 'block' }}></i>
                          <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: '#334155' }}>No students found</p>
                          <p style={{ fontSize: '0.85rem', margin: 0 }}>Try clearing your search query or adjusting your filters.</p>
                        </td>
                      </tr>
                    );
                  }
                  
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = safeFiltered.slice(indexOfFirstItem, indexOfLastItem);
                  
                  return currentItems.map(s => {
                    const name = s.user?.name || s.name;
                    const leaderAssignment = Array.isArray(s.leadershipAssignments) && s.leadershipAssignments.length > 0
                      ? s.leadershipAssignments[0]
                      : null;
                    const aging = getStudentFeeAging(s);

                    return (
                      <tr key={s.id}>
                        <td style={{ color: '#1e293b', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>
                          {s.studentId}
                          {s.nationalId && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'sans-serif', fontWeight: 500 }}>
                              ID: {s.nationalId}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="user-info-cell">
                            <div className="user-avatar student">
                              {s.user?.avatar ? (
                                <img src={getAvatarUrl(s.user.avatar, currentUser?.schoolCode) || ''} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                name.charAt(0)
                              )}
                            </div>
                            <div className="user-name-wrap">
                              <span className="user-name">{name}</span>
                              <div className="role-badges-group">
                                <span className="role-badge role-student">Student</span>
                                {s.gender && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>({s.gender.charAt(0)})</span>
                                )}
                                {(Array.isArray(s.user?.secondaryRoles) ? s.user.secondaryRoles : []).map((r: string, idx: number) => (
                                  <span key={idx} className="secondary-role-badge">{r}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {s.class?.name || 'Unassigned'}
                          </div>
                          {s.class?.level && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.class.level}</div>
                          )}
                        </td>

                        {showLeaderColumn && (
                          <td>
                            {leaderAssignment ? (
                              <span className="badge bg-primary" style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: '#2563eb', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fas fa-award"></i>
                                {leaderAssignment.leadershipRole?.replace('_', ' ')}
                                {leaderAssignment.hostel?.name ? ` (${leaderAssignment.hostel.name})` : ''}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>
                        )}

                        <td>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: s.boardingStatus === 'Boarder' ? '#0284c7' : '#475569' }}>
                            {s.boardingStatus === 'Boarder' ? (
                              <span><i className="fas fa-bed mr-1"></i> Boarder</span>
                            ) : (
                              <span><i className="fas fa-walking mr-1"></i> Day</span>
                            )}
                          </div>
                          {s.hostel?.name && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.hostel.name}</div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{s.user?.phone || s.phone || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.user?.email || s.email || '—'}</div>
                        </td>

                        <td>
                          {aging === 'PAID' ? (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <i className="fas fa-check-circle mr-1"></i> Paid
                            </span>
                          ) : aging === 'PARTIAL' ? (
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              Partial
                            </span>
                          ) : aging === 'OWING_90' ? (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              Owing 90+d
                            </span>
                          ) : aging === 'OWING_60' ? (
                            <span style={{ background: '#ffedd5', color: '#c2410c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              Owing 60+d
                            </span>
                          ) : (
                            <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              Owing 30d
                            </span>
                          )}
                        </td>

                        <td>
                          <span className={`status-badge ${s.status === 'Enrolled' ? 'status-active' : 'status-inactive'}`}>
                            {s.status}
                            {s.user?.isLocked && <span style={{ marginLeft: 5 }}>(Locked)</span>}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons" style={{ display: 'flex', gap: '6px' }}>
                            <button className="portal-btn-ghost" title="View Profile" style={{ padding: '6px', width: '32px', height: '32px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openDetail(s)}>
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="portal-btn-ghost" title="Edit Student" style={{ padding: '6px', width: '32px', height: '32px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEdit(s)}>
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button className="portal-btn-ghost" title={s.user?.isLocked ? "Unlock Access" : "Lock Access"} style={{ padding: '6px', width: '32px', height: '32px', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleLockToggle(s)}>
                              <i className={`fas fa-${s.user?.isLocked ? 'unlock' : 'lock'}`}></i>
                            </button>
                            <button className="portal-btn-ghost" title="Academic History" style={{ padding: '6px', width: '32px', height: '32px', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`${baseStudentsUrl}/${s.id}?tab=academics`)}>
                              <i className="fas fa-history"></i>
                            </button>
                            <button className="portal-btn-ghost" title="Fee Ledger" style={{ padding: '6px', width: '32px', height: '32px', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(isBursar ? `/bursar/fees-management/ledgers?studentId=${s.id}` : `${baseStudentsUrl}/${s.id}?tab=fees`)}>
                              <i className="fas fa-receipt"></i>
                            </button>
                            <button className="portal-btn-ghost" title="Delete Permanent" style={{ padding: '6px', width: '32px', height: '32px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleDelete(s)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            
            {filteredStudents.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredStudents.length ? prev + 1 : prev))}
                    disabled={currentPage * itemsPerPage >= filteredStudents.length}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Selected student slide-out panel if needed */}
      {selectedStudent && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedStudent.user?.name || selectedStudent.name}
          subTitle={`Student ID: ${selectedStudent.studentId}`}
          role="Student"
          secondaryRoles={selectedStudent.user?.secondaryRoles}
          avatarFilename={selectedStudent.user?.avatar}
          avatarText={(selectedStudent.user?.name || selectedStudent.name).charAt(0)}
          onViewFullProfile={() => navigate(`${baseStudentsUrl}/${selectedStudent.id}`)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedStudent); }}
          onResetPassword={() => handleResetPassword(selectedStudent)}
          sections={[
            {
              title: "Academic Information",
              fields: [
                { label: "Current Class", value: selectedStudent.class?.name || 'Unassigned' },
                { label: "Enrollment Status", value: selectedStudent.status },
                { label: "Fees Balance", value: selectedStudent.feesBalance ? `$${selectedStudent.feesBalance}` : '—' }
              ]
            },
            {
              title: "Academic Background",
              fields: [
                { label: "Previous School", value: selectedStudent.prevSchool },
                { label: "Last Grade", value: selectedStudent.lastGradeAchieved },
                { label: "Transfer Reason", value: selectedStudent.reasonForTransfer },
                { label: "Admissions Notes", value: selectedStudent.admissionsNotes }
              ]
            },
            {
              title: "Personal Details",
              fields: [
                { label: "Email Address", value: selectedStudent.user?.email || selectedStudent.email },
                { label: "Phone Number", value: selectedStudent.user?.phone || selectedStudent.phone },
                { label: "Gender", value: selectedStudent.user?.metadata?.gender || selectedStudent.gender },
                { label: "Date of Birth", value: selectedStudent.user?.metadata?.dob ? new Date(selectedStudent.user.metadata.dob).toLocaleDateString() : (selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '—') },
                { label: "National ID", value: selectedStudent.nationalId || selectedStudent.user?.metadata?.nationalId || '—' }
              ]
            },
            {
              title: "Address & Family",
              fields: [
                { label: "Physical Address", value: selectedStudent.user?.metadata?.address || selectedStudent.address },
                { label: "Guardian/Parent", value: selectedStudent.user?.metadata?.nokName || selectedStudent.guardianName },
                { label: "Kin Phone", value: selectedStudent.user?.metadata?.nokPhone || selectedStudent.phone }
              ]
            }
          ]}
        />
      )}

      {/* Edit Modal */}
      {activeUserForEdit && (
        <UserEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={activeUserForEdit}
          currentUserRole={currentUser?.role || ''}
          onSuccess={fetchStudents}
        />
      )}
      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchStudents}
        defaultRole="STUDENT"
      />
    </>
  );
}
