import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type BoardingTab = 'hostels-rooms' | 'allocations' | 'roll-call' | 'exeats';

interface Hostel {
  id: string;
  name: string;
  type: string; // BOYS, GIRLS, MIXED
  capacity: number;
  location?: string;
  description?: string;
  rooms?: RoomItem[];
  _count?: { students: number; bedAllocations?: number };
}

interface RoomItem {
  id: string;
  name: string;
  roomNumber?: string;
  capacity: number;
  bedCount: number;
  conditionStatus: 'GOOD' | 'NEEDS_REPAIR' | 'UNDER_MAINTENANCE' | string;
  hostelId: string;
  hostel?: { name: string };
  _count?: { bedAllocations: number; students: number };
}

interface Allocation {
  id: string;
  studentId: string;
  student?: { id: string; studentId: string; name: string; class?: { name: string } };
  hostelId: string;
  hostel?: { id: string; name: string; type: string };
  roomId?: string;
  room?: { id: string; name: string; conditionStatus?: string };
  term?: string;
  year?: number;
  feeAmount: number;
  invoiceId?: string;
  invoice?: { id: string; invoiceNumber: string; totalAmount: number; status: string };
  status: 'ACTIVE' | 'VACATED' | 'SUSPENDED' | 'CANCELLED' | string;
  isUnpaid?: boolean;
  allocatedAt: string;
  vacatedAt?: string;
}

interface DashboardStats {
  totalHostels: number;
  totalRooms: number;
  totalCapacity: number;
  activeBoarders: number;
  occupancyRate: number;
  pendingExeatsCount: number;
  unpaidCount: number;
  unpaidAllocations: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    className: string;
    hostelName: string;
    roomName?: string;
    feeAmount: number;
    invoiceNumber: string;
    invoiceStatus: string;
  }>;
}

interface RollCallStudent {
  studentId: string;
  studentName: string;
  studentCode: string;
  className?: string;
  roomName?: string;
  status: 'present' | 'absent' | 'on_exeat' | 'sick_bay';
  hasApprovedExeat: boolean;
  exeatDetails?: { id: string; type: string; reason: string } | null;
  notes?: string;
}

interface ExeatRecord {
  id: string;
  studentId: string;
  student?: { id: string; studentId: string; name: string; class?: { name: string }; hostel?: { name: string } };
  type: 'weekend' | 'emergency' | 'medical' | string;
  reason: string;
  departureAt: string;
  returnAt: string;
  status: 'pending_parent' | 'approved' | 'rejected' | 'expired' | 'returned' | string;
  parentSignature?: string;
  parentIp?: string;
  parentSignedAt?: string;
  approvedByHousemasterId?: string;
  approvedByHousemaster?: { id: string; name: string; role: string };
  approvalNotes?: string;
  returnedAt?: string;
  createdAt: string;
}

export default function AdminBoarding() {
  const { showToast, toastConfirm } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Normalize legacy tab names if accessed via older links
  const tabParam = searchParams.get('tab');
  const activeTab: BoardingTab = useMemo(() => {
    if (tabParam === 'hostels' || tabParam === 'rooms' || tabParam === 'hostels-rooms') return 'hostels-rooms';
    if (tabParam === 'allocations') return 'allocations';
    if (tabParam === 'roll-call' || tabParam === 'rollcall') return 'roll-call';
    if (tabParam === 'exeats' || tabParam === 'exeat') return 'exeats';
    return 'hostels-rooms';
  }, [tabParam]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filterUnpaidOnly, setFilterUnpaidOnly] = useState(false);

  // Selected hostel for room drilldown
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');

  // Roll Call State
  const [rcHostelId, setRcHostelId] = useState<string>('');
  const [rcDate, setRcDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rcTime, setRcTime] = useState<'18:00' | '21:00'>('18:00');
  const [rcStudents, setRcStudents] = useState<RollCallStudent[]>([]);
  const [rcLoading, setRcLoading] = useState(false);
  const [rcSaving, setRcSaving] = useState(false);

  // Exeats State
  const [exeats, setExeats] = useState<ExeatRecord[]>([]);
  const [exeatStatusFilter, setExeatStatusFilter] = useState<string>('ALL');

  // Modals
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [showExeatModal, setShowExeatModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'BOYS', capacity: 40, location: '', description: '' });
  const [roomForm, setRoomForm] = useState({ hostelId: '', roomNumber: '', name: '', capacity: 4, bedCount: 4, conditionStatus: 'GOOD' });
  const [assignForm, setAssignForm] = useState({ studentId: '', hostelId: '', roomId: '', term: 'Term 1', feeAmount: 350 });
  const [vacateTarget, setVacateTarget] = useState<{ allocationId: string; studentName: string; feeAmount: number } | null>(null);
  const [vacateReason, setVacateReason] = useState('End of term checkout');
  const [proRataRatio, setProRataRatio] = useState(0); // 0 = no refund, 0.5 = 50% pro-rata
  const [exeatForm, setExeatForm] = useState({ studentId: '', type: 'weekend', reason: '', departureAt: '', returnAt: '' });

  // Student Search filter for assign modal
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'roll-call' && rcHostelId) {
      loadRollCall(rcHostelId, rcDate, rcTime);
    }
  }, [activeTab, rcHostelId, rcDate, rcTime]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard stats
      const statsRes = await api.get('/api/ancillary/boarding/dashboard-stats').catch(() => null);
      if (statsRes?.data) setStats(statsRes.data);

      // 2. Fetch hostels with rooms
      const hostelsRes = await api.get('/api/ancillary/hostels');
      const loadedHostels = Array.isArray(hostelsRes.data) ? hostelsRes.data : [];
      setHostels(loadedHostels);
      if (loadedHostels.length > 0 && !rcHostelId) {
        setRcHostelId(loadedHostels[0].id);
        setSelectedHostelId(loadedHostels[0].id);
      }

      // 3. Fetch allocations
      if (activeTab === 'allocations' || activeTab === 'hostels-rooms') {
        const allocRes = await api.get('/api/ancillary/boarding/allocations');
        setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
      }

      // 4. Fetch students for assign/exeat modal
      const studentsRes = await api.get('/api/students?limit=200').catch(() => null);
      if (studentsRes?.data?.students) {
        setStudents(studentsRes.data.students);
      } else if (Array.isArray(studentsRes?.data)) {
        setStudents(studentsRes.data);
      }

      // 5. Fetch exeats
      if (activeTab === 'exeats') {
        const exeatsRes = await api.get('/api/ancillary/boarding/exeats');
        setExeats(Array.isArray(exeatsRes.data) ? exeatsRes.data : []);
      }
    } catch (err) {
      console.error('Failed to load boarding data:', err);
      showToast('Failed to load boarding management data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRollCall = async (hostelId: string, date: string, time: '18:00' | '21:00') => {
    if (!hostelId) return;
    setRcLoading(true);
    try {
      const res = await api.get(`/api/ancillary/boarding/roll-call?hostelId=${hostelId}&date=${date}&time=${time}`);
      if (res.data?.students) {
        setRcStudents(res.data.students);
      }
    } catch (err) {
      console.error('Failed to load roll call:', err);
      showToast('Failed to load roll call data', 'error');
    } finally {
      setRcLoading(false);
    }
  };

  const handleTabChange = (tab: BoardingTab) => {
    setSearchParams({ tab });
  };

  // ── HOSTEL CREATION ──
  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/ancillary/hostels', hostelForm);
      showToast('Hostel created successfully', 'success');
      setShowHostelModal(false);
      setHostelForm({ name: '', type: 'BOYS', capacity: 40, location: '', description: '' });
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create hostel', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── ROOM CREATION ──
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const hostelId = roomForm.hostelId || selectedHostelId || hostels[0]?.id;
    if (!hostelId) {
      showToast('Please select a hostel', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/ancillary/hostels/${hostelId}/rooms`, roomForm);
      showToast('Room added successfully', 'success');
      setShowRoomModal(false);
      setRoomForm({ hostelId: '', roomNumber: '', name: '', capacity: 4, bedCount: 4, conditionStatus: 'GOOD' });
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create room', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── ROOM CONDITION STATUS TOGGLE ──
  const handleToggleRoomCondition = async (roomId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'GOOD' ? 'NEEDS_REPAIR' : currentStatus === 'NEEDS_REPAIR' ? 'UNDER_MAINTENANCE' : 'GOOD';
    try {
      await api.patch(`/api/ancillary/rooms/${roomId}`, { conditionStatus: nextStatus });
      showToast(`Room condition updated to ${nextStatus}`, 'success');
      loadInitialData();
    } catch (err) {
      showToast('Failed to update room condition', 'error');
    }
  };

  // ── ASSIGN BOARDER ──
  const handleAssignBoarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.studentId || !assignForm.hostelId) {
      showToast('Please select student and hostel', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/ancillary/boarding/assign', assignForm);
      showToast('Boarder allocated successfully. Invoicing posted to Bursar.', 'success');
      setShowAssignModal(false);
      setAssignForm({ studentId: '', hostelId: '', roomId: '', term: 'Term 1', feeAmount: 350 });
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to allocate boarder', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── VACATE BED (PRO-RATA REVERSAL) ──
  const handleConfirmVacate = async () => {
    if (!vacateTarget) return;
    setSubmitting(true);
    try {
      await api.post('/api/ancillary/boarding/vacate', {
        allocationId: vacateTarget.allocationId,
        reason: vacateReason,
        proRataRatio
      });
      showToast(
        proRataRatio > 0
          ? `Bed vacated. Pro-rata credit note (${Math.round(proRataRatio * 100)}%) issued to Bursar ledger.`
          : 'Bed vacated successfully.',
        'success'
      );
      setShowVacateModal(false);
      setVacateTarget(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to vacate bed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── TOGGLE ALLOCATION STATUS (ACTIVE / SUSPENDED) ──
  const handleToggleAllocationStatus = async (allocId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/api/ancillary/boarding/allocations/${allocId}/status`, { status: nextStatus });
      showToast(`Allocation status updated to ${nextStatus}`, 'success');
      loadInitialData();
    } catch (err) {
      showToast('Failed to update allocation status', 'error');
    }
  };

  // ── ROLL CALL STATUS CLICK ──
  const handleRollCallStatusChange = (studentId: string, newStatus: 'present' | 'absent' | 'on_exeat' | 'sick_bay') => {
    setRcStudents(prev =>
      prev.map(s => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // ── SAVE ROLL CALL ──
  const handleSaveRollCall = async () => {
    if (!rcHostelId || !rcStudents.length) return;
    setRcSaving(true);
    try {
      const payload = {
        hostelId: rcHostelId,
        date: rcDate,
        time: rcTime,
        records: rcStudents.map(s => ({
          studentId: s.studentId,
          status: s.status,
          notes: s.notes
        }))
      };
      const res = await api.post('/api/ancillary/boarding/roll-call', payload);
      showToast(res.data?.message || 'Night roll call recorded successfully', 'success');
      if (res.data?.absentCasesLogged > 0) {
        showToast(`⚠️ ${res.data.absentCasesLogged} unauthorized absence(s) flagged to /admin/discipline with parent SMS alerts`, 'warning');
      }
      if (res.data?.sickBayAdmissions > 0) {
        showToast(`🏥 ${res.data.sickBayAdmissions} student(s) registered with Clinic Hospitalization`, 'info');
      }
      loadRollCall(rcHostelId, rcDate, rcTime);
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save roll call', 'error');
    } finally {
      setRcSaving(false);
    }
  };

  // ── EXEAT WORKFLOW ──
  const handleCreateExeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exeatForm.studentId || !exeatForm.departureAt || !exeatForm.returnAt) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/ancillary/boarding/exeats', exeatForm);
      showToast('Exeat request submitted for parent digital signature', 'success');
      setShowExeatModal(false);
      setExeatForm({ studentId: '', type: 'weekend', reason: '', departureAt: '', returnAt: '' });
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create exeat', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExeat = async (exeatId: string) => {
    try {
      await api.post(`/api/ancillary/boarding/exeats/${exeatId}/approve`, {
        approvalNotes: 'Approved by housemaster on duty'
      });
      showToast('Exeat approved! Day attendance & night roll call synced to "On Exeat".', 'success');
      loadInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve exeat', 'error');
    }
  };

  const handleRejectExeat = async (exeatId: string) => {
    try {
      await api.post(`/api/ancillary/boarding/exeats/${exeatId}/reject`, {
        approvalNotes: 'Declined due to academic/disciplinary restrictions'
      });
      showToast('Exeat request rejected', 'info');
      loadInitialData();
    } catch (err: any) {
      showToast('Failed to reject exeat', 'error');
    }
  };

  const handleReturnExeat = async (exeatId: string) => {
    try {
      await api.post(`/api/ancillary/boarding/exeats/${exeatId}/return`, {});
      showToast('Student successfully signed back in from exeat', 'success');
      loadInitialData();
    } catch (err: any) {
      showToast('Failed to mark exeat returned', 'error');
    }
  };

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    if (filterUnpaidOnly) {
      return allocations.filter(a => a.isUnpaid);
    }
    return allocations;
  }, [allocations, filterUnpaidOnly]);

  // Filtered exeats
  const filteredExeats = useMemo(() => {
    if (exeatStatusFilter === 'ALL') return exeats;
    return exeats.filter(e => e.status.toUpperCase() === exeatStatusFilter);
  }, [exeats, exeatStatusFilter]);

  // Filtered students for modal
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return students;
    const term = studentSearchTerm.toLowerCase();
    return students.filter(s =>
      s.name?.toLowerCase().includes(term) ||
      s.studentId?.toLowerCase().includes(term) ||
      s.class?.name?.toLowerCase().includes(term)
    );
  }, [students, studentSearchTerm]);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.65rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-hotel" style={{ color: '#2563eb' }}></i>
            Boarding & Hostel Operations
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Hostel facilities, live night roll call (18:00 / 21:00), bed allocations with Bursar billing, and legal digital exeats.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'hostels-rooms' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRoomModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '6px' }}
              >
                <i className="fas fa-door-open"></i> + Add Room
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowHostelModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}
              >
                <i className="fas fa-plus"></i> + Add Hostel
              </button>
            </>
          )}

          {activeTab === 'allocations' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAssignModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}
            >
              <i className="fas fa-bed"></i> + Assign Boarder
            </button>
          )}

          {activeTab === 'exeats' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowExeatModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}
            >
              <i className="fas fa-id-card-alt"></i> + Request Exeat
            </button>
          )}
        </div>
      </div>

      {/* ── RED FLAG UNPAID ACCOMMODATION BANNER (SPEC REQUIREMENT) ── */}
      {stats && stats.unpaidCount > 0 && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '1.25rem' }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: 700 }}>
                Unpaid Accommodation Fees Warning ({stats.unpaidCount} Boarders)
              </h4>
              <p style={{ margin: '4px 0 0 0', color: '#b91c1c', fontSize: '0.88rem' }}>
                {stats.unpaidCount} students currently allocated to hostel beds have outstanding accommodation invoices with the Bursar.
              </p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                handleTabChange('allocations');
                setFilterUnpaidOnly(true);
              }}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-filter"></i>
              View Unpaid Boarders
            </button>
          </div>
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>HOSTELS & DORMS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>{stats?.totalHostels ?? hostels.length}</div>
          <div style={{ fontSize: '0.82rem', color: '#059669', marginTop: '4px' }}>
            <i className="fas fa-door-closed"></i> {stats?.totalRooms ?? 0} total rooms
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL BED CAPACITY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>{stats?.totalCapacity ?? 0}</div>
          <div style={{ fontSize: '0.82rem', color: '#2563eb', marginTop: '4px' }}>
            <i className="fas fa-chart-pie"></i> {stats?.occupancyRate ?? 0}% occupancy
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>ACTIVE BOARDERS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0284c7', marginTop: '6px' }}>{stats?.activeBoarders ?? allocations.length}</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
            <i className="fas fa-user-check"></i> Resident on campus
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>EXEAT PERMITS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#d97706', marginTop: '6px' }}>{stats?.pendingExeatsCount ?? 0}</div>
          <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '4px' }}>
            <i className="fas fa-clock"></i> Pending authorization
          </div>
        </div>
      </div>

      {/* ── 4 CANONICAL TABS (PHASE 3 SPEC) ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('hostels-rooms')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            color: activeTab === 'hostels-rooms' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'hostels-rooms' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-building"></i> Hostels & Rooms
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('allocations')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            color: activeTab === 'allocations' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'allocations' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-users"></i> Allocations
          {stats && stats.unpaidCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '10px' }}>
              {stats.unpaidCount} unpaid
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('roll-call')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            color: activeTab === 'roll-call' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'roll-call' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-clipboard-check"></i> Night Roll Call
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('exeats')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            color: activeTab === 'exeats' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'exeats' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-id-card"></i> Exeats
        </button>
      </div>

      {/* ════════════ TAB 1: HOSTELS & ROOMS ════════════ */}
      {activeTab === 'hostels-rooms' && (
        <div>
          {hostels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <i className="fas fa-hotel" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px' }}></i>
              <h3 style={{ color: '#1e293b', marginBottom: '6px' }}>No Hostels Configured</h3>
              <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                Set up your school residential dormitories, capacities, and rooms to start allocating boarders.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowHostelModal(true)}
                style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}
              >
                + Create First Hostel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {hostels.map(h => (
                <div key={h.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {/* Hostel Header */}
                  <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                        <i className="fas fa-hotel"></i>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem', fontWeight: 700 }}>
                          {h.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>
                          <span><i className="fas fa-venus-mars"></i> {h.type}</span>
                          <span><i className="fas fa-map-marker-alt"></i> {h.location || 'Campus'}</span>
                          <span><i className="fas fa-users"></i> Capacity: {h.capacity} beds</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setRoomForm(prev => ({ ...prev, hostelId: h.id }));
                          setShowRoomModal(true);
                        }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        <i className="fas fa-plus"></i> Add Room
                      </button>
                    </div>
                  </div>

                  {/* Rooms list */}
                  <div style={{ padding: '16px 20px' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Rooms & Bed Maintenance Status ({h.rooms?.length || 0} Rooms)
                    </h5>

                    {(!h.rooms || h.rooms.length === 0) ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, fontStyle: 'italic' }}>
                        No rooms created for this hostel yet. Click "Add Room" above to add room numbers and bed counts.
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                        {h.rooms.map(rm => {
                          const conditionColor = rm.conditionStatus === 'GOOD' ? '#10b981' : rm.conditionStatus === 'NEEDS_REPAIR' ? '#f59e0b' : '#ef4444';
                          const conditionBg = rm.conditionStatus === 'GOOD' ? '#ecfdf5' : rm.conditionStatus === 'NEEDS_REPAIR' ? '#fffbeb' : '#fef2f2';

                          return (
                            <div key={rm.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{rm.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Room #{rm.roomNumber || rm.name}</div>
                                </div>
                                <span
                                  onClick={() => handleToggleRoomCondition(rm.id, rm.conditionStatus)}
                                  title="Click to toggle condition status"
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: conditionBg,
                                    color: conditionColor,
                                    cursor: 'pointer',
                                    border: `1px solid ${conditionColor}33`
                                  }}
                                >
                                  {rm.conditionStatus || 'GOOD'}
                                </span>
                              </div>

                              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                                <span><i className="fas fa-bed"></i> Beds: {rm.bedCount || rm.capacity}</span>
                                <span><i className="fas fa-user-friends"></i> Allocated: {rm._count?.bedAllocations || 0}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB 2: ALLOCATIONS ════════════ */}
      {activeTab === 'allocations' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          {/* Allocations Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setFilterUnpaidOnly(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: !filterUnpaidOnly ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: !filterUnpaidOnly ? '#eff6ff' : '#fff',
                  color: !filterUnpaidOnly ? '#2563eb' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                All Allocations ({allocations.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterUnpaidOnly(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: filterUnpaidOnly ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  background: filterUnpaidOnly ? '#fef2f2' : '#fff',
                  color: filterUnpaidOnly ? '#dc2626' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-exclamation-circle" style={{ color: '#ef4444' }}></i>
                Unpaid Fees Only ({allocations.filter(a => a.isUnpaid).length})
              </button>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAssignModal(true)}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '0.88rem' }}
              >
                <i className="fas fa-plus"></i> Allocate Student to Bed
              </button>
            </div>
          </div>

          {/* Allocations Table */}
          {filteredAllocations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <i className="fas fa-users-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '12px' }}></i>
              <p>No bed allocations match the selected filter.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 14px' }}>STUDENT</th>
                    <th style={{ padding: '12px 14px' }}>CLASS</th>
                    <th style={{ padding: '12px 14px' }}>HOSTEL & ROOM</th>
                    <th style={{ padding: '12px 14px' }}>TERM</th>
                    <th style={{ padding: '12px 14px' }}>FEE AMOUNT</th>
                    <th style={{ padding: '12px 14px' }}>INVOICE / PAYMENT</th>
                    <th style={{ padding: '12px 14px' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllocations.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.student?.name || 'Unknown Student'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{a.student?.studentId}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {a.student?.class?.name || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{a.hostel?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{a.room?.name || 'Unassigned room'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {a.term} ({a.year || 2026})
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                        ${a.feeAmount?.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {a.isUnpaid ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <i className="fas fa-exclamation-circle"></i> UNPAID
                          </span>
                        ) : a.invoice?.status === 'paid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <i className="fas fa-check-circle"></i> PAID
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                            {a.invoice?.status || 'No Fee'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: a.status === 'ACTIVE' ? '#eff6ff' : a.status === 'SUSPENDED' ? '#fffbeb' : '#f1f5f9',
                            color: a.status === 'ACTIVE' ? '#2563eb' : a.status === 'SUSPENDED' ? '#d97706' : '#64748b'
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {a.status === 'ACTIVE' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleAllocationStatus(a.id, a.status)}
                              className="btn btn-sm"
                              title="Suspend Allocation"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '4px' }}
                            >
                              Suspend
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVacateTarget({
                                  allocationId: a.id,
                                  studentName: a.student?.name || 'Student',
                                  feeAmount: a.feeAmount
                                });
                                setShowVacateModal(true);
                              }}
                              className="btn btn-sm"
                              title="Vacate Bed (Credit Note Reversal)"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px' }}
                            >
                              Vacate Bed
                            </button>
                          </div>
                        )}
                        {a.status === 'SUSPENDED' && (
                          <button
                            type="button"
                            onClick={() => handleToggleAllocationStatus(a.id, a.status)}
                            className="btn btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px' }}
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB 3: NIGHT ROLL CALL (18:00 & 21:00) ════════════ */}
      {activeTab === 'roll-call' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          {/* Roll Call Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>HOSTEL</label>
                <select
                  value={rcHostelId}
                  onChange={e => setRcHostelId(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', minWidth: '180px' }}
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>DATE</label>
                <input
                  type="date"
                  value={rcDate}
                  onChange={e => setRcDate(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>TIME SLOT</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setRcTime('18:00')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: rcTime === '18:00' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: rcTime === '18:00' ? '#eff6ff' : '#fff',
                      color: rcTime === '18:00' ? '#2563eb' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    18:00 (Dinner / Evening)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRcTime('21:00')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: rcTime === '21:00' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: rcTime === '21:00' ? '#eff6ff' : '#fff',
                      color: rcTime === '21:00' ? '#2563eb' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    21:00 (Bedtime Dormitory)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRollCall}
                disabled={rcSaving || rcStudents.length === 0}
                style={{ padding: '10px 20px', background: '#059669', color: '#fff', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-save"></i>
                {rcSaving ? 'Saving...' : 'Submit & Sign Off Roll Call'}
              </button>
            </div>
          </div>

          {/* Operational Rules Info Alert */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.86rem', color: '#334155', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <i className="fas fa-info-circle" style={{ color: '#0284c7', fontSize: '1.1rem' }}></i>
            <div>
              <strong>Roll Call Automated Linkages:</strong>
              &nbsp;Marking a student <strong>Absent</strong> without an approved exeat triggers a Parent SMS and registers a HIGH severity case in <code>/admin/discipline</code>.
              Marking <strong>Sick Bay</strong> admits the learner directly to Clinic Hospitalization.
              Approved exeats automatically set status to <strong>On Exeat</strong>.
            </div>
          </div>

          {/* Students Roll Call Table */}
          {rcLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
              <p style={{ marginTop: '10px' }}>Loading boarders for roll call...</p>
            </div>
          ) : rcStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>No active boarders allocated to this hostel.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '10px 14px' }}>STUDENT</th>
                    <th style={{ padding: '10px 14px' }}>CLASS</th>
                    <th style={{ padding: '10px 14px' }}>ROOM</th>
                    <th style={{ padding: '10px 14px' }}>PERMITS</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>STATUS TOGGLE</th>
                  </tr>
                </thead>
                <tbody>
                  {rcStudents.map(st => (
                    <tr key={st.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{st.studentName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{st.studentCode}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{st.className || '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{st.roomName || 'General'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {st.hasApprovedExeat ? (
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                            <i className="fas fa-check"></i> Approved Exeat ({st.exeatDetails?.type})
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleRollCallStatusChange(st.studentId, 'present')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: st.status === 'present' ? '2px solid #10b981' : '1px solid #cbd5e1',
                              background: st.status === 'present' ? '#10b981' : '#fff',
                              color: st.status === 'present' ? '#fff' : '#475569'
                            }}
                          >
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRollCallStatusChange(st.studentId, 'absent')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: st.status === 'absent' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                              background: st.status === 'absent' ? '#ef4444' : '#fff',
                              color: st.status === 'absent' ? '#fff' : '#475569'
                            }}
                          >
                            Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRollCallStatusChange(st.studentId, 'on_exeat')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: st.status === 'on_exeat' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                              background: st.status === 'on_exeat' ? '#3b82f6' : '#fff',
                              color: st.status === 'on_exeat' ? '#fff' : '#475569'
                            }}
                          >
                            On Exeat
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRollCallStatusChange(st.studentId, 'sick_bay')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: st.status === 'sick_bay' ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                              background: st.status === 'sick_bay' ? '#8b5cf6' : '#fff',
                              color: st.status === 'sick_bay' ? '#fff' : '#475569'
                            }}
                          >
                            Sick Bay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB 4: EXEATS ════════════ */}
      {activeTab === 'exeats' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          {/* Exeats Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'PENDING_PARENT', 'APPROVED', 'RETURNED', 'REJECTED'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setExeatStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: exeatStatusFilter === st ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: exeatStatusFilter === st ? '#eff6ff' : '#fff',
                    color: exeatStatusFilter === st ? '#2563eb' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowExeatModal(true)}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '0.88rem' }}
              >
                + Request Exeat
              </button>
            </div>
          </div>

          {filteredExeats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fas fa-id-badge" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '10px' }}></i>
              <p>No exeat passes match the current filter.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 14px' }}>STUDENT</th>
                    <th style={{ padding: '12px 14px' }}>TYPE & REASON</th>
                    <th style={{ padding: '12px 14px' }}>DEPARTURE / RETURN</th>
                    <th style={{ padding: '12px 14px' }}>PARENT SIGNATURE</th>
                    <th style={{ padding: '12px 14px' }}>HOUSEMASTER APPROVAL</th>
                    <th style={{ padding: '12px 14px' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExeats.map(ex => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{ex.student?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{ex.student?.class?.name} • {ex.student?.hostel?.name}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize', color: '#2563eb' }}>{ex.type} Exeat</div>
                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>{ex.reason}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#475569' }}>
                        <div>Dep: {new Date(ex.departureAt).toLocaleDateString()}</div>
                        <div>Ret: {new Date(ex.returnAt).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {ex.parentSignature ? (
                          <div style={{ fontSize: '0.82rem', color: '#059669' }}>
                            <div><i className="fas fa-signature"></i> {ex.parentSignature}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>IP: {ex.parentIp || 'Logged'}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#d97706', fontStyle: 'italic' }}>Pending Signature</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {ex.approvedByHousemaster ? (
                          <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                            <div>{ex.approvedByHousemaster.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{ex.approvalNotes || 'Authorized'}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Not Reviewed</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background:
                              ex.status === 'approved' ? '#ecfdf5' :
                              ex.status === 'returned' ? '#f1f5f9' :
                              ex.status === 'rejected' ? '#fef2f2' : '#fffbeb',
                            color:
                              ex.status === 'approved' ? '#059669' :
                              ex.status === 'returned' ? '#475569' :
                              ex.status === 'rejected' ? '#dc2626' : '#d97706'
                          }}
                        >
                          {ex.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {ex.status === 'pending_parent' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveExeat(ex.id)}
                                className="btn btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px' }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectExeat(ex.id)}
                                className="btn btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px' }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {ex.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleReturnExeat(ex.id)}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px' }}
                            >
                              Mark Returned
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════ MODALS ════════════ */}

      {/* 1. Add Hostel Modal */}
      {showHostelModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Create New Hostel</h3>
            <form onSubmit={handleCreateHostel}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Hostel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bishop Gaul Hostel"
                  value={hostelForm.name}
                  onChange={e => setHostelForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Hostel Type</label>
                  <select
                    value={hostelForm.type}
                    onChange={e => setHostelForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="BOYS">Boys</option>
                    <option value="GIRLS">Girls</option>
                    <option value="MIXED">Mixed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Total Bed Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={hostelForm.capacity}
                    onChange={e => setHostelForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Location / Wing</label>
                <input
                  type="text"
                  placeholder="e.g. North Campus, Block B"
                  value={hostelForm.location}
                  onChange={e => setHostelForm(prev => ({ ...prev, location: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowHostelModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}>
                  {submitting ? 'Creating...' : 'Create Hostel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Room Modal */}
      {showRoomModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Add Room to Hostel</h3>
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Hostel</label>
                <select
                  value={roomForm.hostelId || selectedHostelId}
                  onChange={e => setRoomForm(prev => ({ ...prev, hostelId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Room Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={roomForm.roomNumber}
                    onChange={e => setRoomForm(prev => ({ ...prev, roomNumber: e.target.value, name: `Room ${e.target.value}` }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Bed Count</label>
                  <input
                    type="number"
                    min={1}
                    value={roomForm.bedCount}
                    onChange={e => setRoomForm(prev => ({ ...prev, bedCount: parseInt(e.target.value) || 0, capacity: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Initial Condition Status</label>
                <select
                  value={roomForm.conditionStatus}
                  onChange={e => setRoomForm(prev => ({ ...prev, conditionStatus: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="GOOD">Good Condition</option>
                  <option value="NEEDS_REPAIR">Needs Repair</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowRoomModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}>
                  {submitting ? 'Adding...' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Assign Boarder Modal (Bursar Billing Integration) */}
      {showAssignModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '540px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Assign Student to Hostel Bed</h3>

            <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #bfdbfe', marginBottom: '16px', fontSize: '0.85rem', color: '#1e40af' }}>
              <i className="fas fa-file-invoice-dollar"></i>&nbsp;<strong>Automatic Bursar Billing:</strong> Assigning a bed will post a standard accommodation invoice to Revenue Account <strong>4020</strong> with idempotency protection.
            </div>

            <form onSubmit={handleAssignBoarder}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Select Student</label>
                <input
                  type="text"
                  placeholder="Search student by name or ID..."
                  value={studentSearchTerm}
                  onChange={e => setStudentSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '6px', fontSize: '0.85rem' }}
                />
                <select
                  required
                  value={assignForm.studentId}
                  onChange={e => setAssignForm(prev => ({ ...prev, studentId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Learner --</option>
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.studentId}) {s.class?.name ? `• ${s.class.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Hostel</label>
                  <select
                    required
                    value={assignForm.hostelId}
                    onChange={e => setAssignForm(prev => ({ ...prev, hostelId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Choose Hostel --</option>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Term</label>
                  <select
                    value={assignForm.term}
                    onChange={e => setAssignForm(prev => ({ ...prev, term: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Boarding Fee ($ USD)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={assignForm.feeAmount}
                  onChange={e => setAssignForm(prev => ({ ...prev, feeAmount: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}>
                  {submitting ? 'Allocating & Invoicing...' : 'Allocate & Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Vacate Bed Modal (Pro-Rata Credit Note) */}
      {showVacateModal && vacateTarget && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '460px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Vacate Bed: {vacateTarget.studentName}</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
              Confirm student checkout. You can optionally issue a pro-rata Credit Note reversal to the Bursar ledger.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Reason</label>
              <input
                type="text"
                value={vacateReason}
                onChange={e => setVacateReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Pro-Rata Credit Note Reversal Ratio: {Math.round(proRataRatio * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={proRataRatio}
                onChange={e => setProRataRatio(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                <span>0% (No reversal)</span>
                <span>50% (Mid-term departure)</span>
                <span>100% (Full refund)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowVacateModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
              <button type="button" onClick={handleConfirmVacate} disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', borderRadius: '6px' }}>
                {submitting ? 'Processing...' : 'Confirm Vacate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Request Exeat Modal */}
      {showExeatModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Request Exeat Pass</h3>
            <form onSubmit={handleCreateExeat}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Student</label>
                <select
                  required
                  value={exeatForm.studentId}
                  onChange={e => setExeatForm(prev => ({ ...prev, studentId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Select Boarder --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Exeat Type</label>
                <select
                  value={exeatForm.type}
                  onChange={e => setExeatForm(prev => ({ ...prev, type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="weekend">Weekend Exeat</option>
                  <option value="medical">Medical Exeat (Hospital / Doctor)</option>
                  <option value="emergency">Family Emergency Exeat</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Departure Date</label>
                  <input
                    type="date"
                    required
                    value={exeatForm.departureAt}
                    onChange={e => setExeatForm(prev => ({ ...prev, departureAt: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Return Date</label>
                  <input
                    type="date"
                    required
                    value={exeatForm.returnAt}
                    onChange={e => setExeatForm(prev => ({ ...prev, returnAt: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Reason / Destination Details</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Provide purpose of departure..."
                  value={exeatForm.reason}
                  onChange={e => setExeatForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowExeatModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px' }}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
