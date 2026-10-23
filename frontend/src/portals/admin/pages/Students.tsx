import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl, formatCurrency, parseCleanBadges } from '../../../utils/formatters';
import { SearchInput, FilterBar, ExportButton, DataImportModal, SkeletonLoader } from '../../../components/shared';
import type { ExportColumn } from '../../../utils/exportService';
import '../../../styles/portal.css';

export default function AdminStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBursar = location.pathname.startsWith('/bursar');
  const baseStudentsUrl = isBursar ? '/bursar/students' : '/admin/students';

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
  const [isParentLinksModalOpen, setIsParentLinksModalOpen] = useState(false);
  const [parentLinkRequests, setParentLinkRequests] = useState<any[]>([]);
  const [parentLinkFilter, setParentLinkFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [loadingParentLinks, setLoadingParentLinks] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast, toastConfirm } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

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
    if (!isBursar) {
      fetchParentLinkRequests();
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setIsCreateModalOpen(true);
    }
    if (params.get('tab') === 'parent-links') {
      setIsParentLinksModalOpen(true);
    }
  }, []);

  const fetchParentLinkRequests = async () => {
    setLoadingParentLinks(true);
    try {
      const { data } = await api.get('/api/schools/connections/pending?role=PARENT&status=ALL');
      setParentLinkRequests(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingParentLinks(false);
    }
  };

  const handleParentLinkAction = async (connectionId: string, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/api/schools/connections/${connectionId}/${action}`);
      showToast(
        action === 'approve'
          ? 'Parent-Student link approved! Parent status is now Active.'
          : 'Parent-Student link rejected/revoked.',
        'success'
      );
      fetchParentLinkRequests();
    } catch (err: any) {
      showToast(err?.response?.data?.error || `Failed to ${action} parent link`, 'error');
    }
  };

  const pendingParentLinksCount = useMemo(
    () => parentLinkRequests.filter(r => (r.linkStatus || 'PENDING') === 'PENDING').length,
    [parentLinkRequests]
  );

  const filteredParentLinkRequests = useMemo(() => {
    if (parentLinkFilter === 'ALL') return parentLinkRequests;
    return parentLinkRequests.filter(r => (r.linkStatus || 'PENDING') === parentLinkFilter);
  }, [parentLinkRequests, parentLinkFilter]);

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
        limit: '500',
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

  const getStudentLeaderBadges = (s: any): string[] => {
    const cleanAssigned = parseCleanBadges(s.leadershipAssignments);
    const cleanSec = parseCleanBadges(s.user?.secondaryRoles || s.secondaryRoles);
    const secLeaders = cleanSec.filter(r => 
      /prefect|monitor|head boy|head girl|captain|leader|council|representative/i.test(r)
    );
    const direct = parseCleanBadges(s.leaderRole || s.leadershipRole || s.user?.leaderRole);
    return Array.from(new Set([...cleanAssigned, ...secLeaders, ...direct]));
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
      if (leadersOnly && getStudentLeaderBadges(s).length === 0) {
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

  const studentExportColumns: ExportColumn[] = useMemo(() => [
    { header: 'STN / Student ID', formatter: s => s.studentId || s.admissionNumber || s.id },
    { header: 'Full Name', formatter: s => s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() },
    { header: 'National ID', formatter: s => s.nationalId || '—' },
    { header: 'Admission No', formatter: s => s.admissionNumber || '—' },
    { header: 'Class / Form', formatter: s => s.class?.name ? `${s.class.name} (${s.class.level || ''})` : 'Unassigned' },
    { header: 'Status', formatter: s => s.status || 'Active' },
    { header: 'Boarding', formatter: s => s.boardingStatus || (s.isBoarding ? 'Boarder' : 'Day') },
    { header: 'Gender', formatter: s => s.gender || '—' },
    { header: 'Hostel / Dorm', formatter: s => s.hostel?.name || '—' },
    { header: 'Transport Route', formatter: s => s.route?.name || '—' },
    { header: 'Fee Status', formatter: s => getStudentFeeAging(s) },
    { header: 'Leadership', formatter: s => getStudentLeaderBadges(s).join(', ') || 'None' },
    { header: 'Phone / Contact', formatter: s => s.phone || s.emergencyContact || '—' },
  ], []);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Student Management</h1>
          <p>View, search, filter, and manage school student profiles, enrollment, and credentials.</p>
        </div>
        {!isBursar && (
          <button
            type="button"
            onClick={() => { fetchParentLinkRequests(); setIsParentLinksModalOpen(true); }}
            style={{
              height: '42px',
              padding: '0 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              background: pendingParentLinksCount > 0 ? '#fffbeb' : '#f8fafc',
              color: pendingParentLinksCount > 0 ? '#b45309' : '#334155',
              border: pendingParentLinksCount > 0 ? '2px solid #f59e0b' : '1px solid #cbd5e1',
              boxShadow: pendingParentLinksCount > 0 ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
            }}
          >
            <i className="fas fa-user-check" style={{ color: pendingParentLinksCount > 0 ? '#d97706' : '#2563eb' }}></i>
            Parent Link Approvals
            <span
              style={{
                background: pendingParentLinksCount > 0 ? '#d97706' : '#e2e8f0',
                color: pendingParentLinksCount > 0 ? '#fff' : '#475569',
                borderRadius: '999px',
                padding: '2px 9px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}
            >
              {pendingParentLinksCount} Pending
            </span>
          </button>
        )}
      </div>

      {/* Prominent Pending Parent-Student Link Banner */}
      {!isBursar && pendingParentLinksCount > 0 && (
        <div
          style={{
            background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderLeft: '5px solid #f59e0b',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <i className="fas fa-user-friends"></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
                {pendingParentLinksCount} Pending Parent–Student Link Request{pendingParentLinksCount > 1 ? 's' : ''} Awaiting Approval
              </div>
              <div style={{ color: '#b45309', fontSize: '0.82rem' }}>
                Approve verified parent requests so their Parent Portal status changes from Pending to Active.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setParentLinkFilter('PENDING'); setIsParentLinksModalOpen(true); }}
            style={{
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-check-double"></i> Review & Approve Links
          </button>
        </div>
      )}

      <div className="portal-card" style={{ marginBottom: '24px' }}>
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '280px', maxWidth: '480px' }}>
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              loading={loading}
              placeholder="Search by STN, Name, National ID, Phone, Email..."
            />
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

            <ExportButton
              filename="students_directory"
              title="Student Directory & Enrollment Report"
              subtitle={`Filtered: ${filteredStudents.length} of ${students.length} students`}
              columns={studentExportColumns}
              data={filteredStudents}
              orientation="landscape"
            />

            <button 
              className="portal-btn-secondary" 
              onClick={() => setIsImportModalOpen(true)} 
              style={{ padding: '0 16px', fontWeight: 700, height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-file-import"></i> Bulk Import
            </button>

            <button 
              className="portal-btn-primary" 
              onClick={() => setIsCreateModalOpen(true)} 
              style={{ padding: '0 24px', fontWeight: 800, height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-user-plus"></i> New Student
            </button>
          </div>
        </div>

        {/* Combinable Filters Bar */}
        <FilterBar
          title="Refine Directory Filters"
          hasActiveFilters={hasActiveFilters}
          onReset={handleResetFilters}
        >
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
        </FilterBar>

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
            <div style={{ padding: '16px' }}>
              <SkeletonLoader type="table" rows={8} columns={8} />
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
                    const leaderBadges = getStudentLeaderBadges(s);
                    const cleanSecRoles = parseCleanBadges(s.user?.secondaryRoles || s.secondaryRoles);
                    const nonLeaderSecRoles = cleanSecRoles.filter(r => !leaderBadges.includes(r));
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
                                {nonLeaderSecRoles.map((r: string, idx: number) => (
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
                            {leaderBadges.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {leaderBadges.map((badge, bIdx) => (
                                  <span key={bIdx} className="badge bg-primary" style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: '#2563eb', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fas fa-award"></i>
                                    {badge}
                                  </span>
                                ))}
                              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</strong> of <strong>{filteredStudents.length}</strong> students
                  </span>
                  <select
                    className="portal-input"
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem', height: 32 }}
                  >
                    <option value={12}>12 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                  >
                    First
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>
                    Page {currentPage} of {Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredStudents.length ? prev + 1 : prev))}
                    disabled={currentPage * itemsPerPage >= filteredStudents.length}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage)))}
                    disabled={currentPage * itemsPerPage >= filteredStudents.length}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Parent-Student Link Approvals Modal */}
      {isParentLinksModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsParentLinksModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-user-check" style={{ color: '#2563eb', marginRight: 10 }}></i>
                  Parent–Student Link Requests & Approvals
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Approve parent link requests so their account status changes from <strong>Pending</strong> to <strong>Active (Approved)</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsParentLinksModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', color: '#475569', fontSize: '1rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '14px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['PENDING', 'APPROVED', 'ALL'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setParentLinkFilter(f)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: parentLinkFilter === f ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: parentLinkFilter === f ? '#2563eb' : '#fff',
                      color: parentLinkFilter === f ? '#fff' : '#475569'
                    }}
                  >
                    {f === 'PENDING' ? `Pending (${pendingParentLinksCount})` : f === 'APPROVED' ? 'Approved' : `All (${parentLinkRequests.length})`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={fetchParentLinkRequests}
                className="portal-btn-ghost"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <i className="fas fa-sync-alt mr-1"></i> Refresh
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingParentLinks ? (
                <SkeletonLoader type="table" rows={4} columns={5} />
              ) : filteredParentLinkRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <i className="fas fa-check-circle fa-2x" style={{ color: '#10b981', marginBottom: 10, display: 'block' }}></i>
                  <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>No {parentLinkFilter.toLowerCase()} parent-student link requests found.</p>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>When a parent links a student ID from the Parent Portal, it appears here for verification.</p>
                </div>
              ) : (
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Parent / Guardian</th>
                      <th>Relationship</th>
                      <th>Linked Student</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParentLinkRequests.map((req: any) => {
                      const status = (req.linkStatus || 'PENDING').toUpperCase();
                      return (
                        <tr key={req.connectionId || req.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{req.name || 'Parent'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{req.email || '—'} &bull; {req.phone || '—'}</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>{req.relation || 'Parent'}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: '#2563eb' }}>{req.studentName}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {req.studentId} &bull; {req.studentClass || 'Class'}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: status === 'APPROVED' ? '#dcfce7' : status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                                color: status === 'APPROVED' ? '#15803d' : status === 'PENDING' ? '#b45309' : '#b91c1c'
                              }}
                            >
                              {status === 'APPROVED' ? 'APPROVED (ACTIVE)' : status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8 }}>
                              {status !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleParentLinkAction(req.connectionId, 'approve')}
                                  style={{
                                    background: '#16a34a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <i className="fas fa-check mr-1"></i> Approve
                                </button>
                              )}
                              {status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleParentLinkAction(req.connectionId, 'reject')}
                                  style={{
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <i className="fas fa-times mr-1"></i> {status === 'APPROVED' ? 'Revoke' : 'Reject'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Bulk Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchStudents}
        title="Bulk Import Students"
        templateUrl="/api/students/template"
        importUrl="/api/students/import"
        templateFilename="student_import_template.xlsx"
        entityName="students"
      />
    </>
  );
}
