import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import TabbedPage, { type TabItem } from '../../../components/portals/shared/TabbedPage';
import { SearchableCombobox, type ComboboxOption, SkeletonLoader, PaginatedTable } from '../../../components/shared';

interface HostelRoom {
  id?: string;
  name?: string;
  capacity?: number;
  _count?: {
    students?: number;
  };
}

interface Hostel {
  id: string;
  name: string;
  type?: string;
  capacity: number;
  warden?: {
    id?: string;
    name: string;
  } | null;
  rooms?: HostelRoom[];
}

interface BoarderStudent {
  id: string;
  name: string;
  studentId: string;
  boardingStatus?: string;
  hostelId?: string | null;
  hostel?: {
    id?: string;
    name?: string;
  } | null;
  class?: {
    id?: string;
    name?: string;
    level?: string;
  } | null;
  roomNumber?: string | null;
  bedNumber?: string | null;
}

interface RequisitionItem {
  name?: string;
  itemName?: string;
  quantity: number;
}

interface Requisition {
  id: string;
  refNumber?: string;
  title?: string;
  description?: string;
  status: string;
  createdAt: string;
  requesterRole?: string;
  requestedByStudent?: { name: string } | null;
  hostelReq?: { name: string } | null;
  items?: RequisitionItem[];
  requester?: { name: string } | null;
  department?: { name: string } | null;
  estimatedAmount?: number;
}

interface SickBayBoarder {
  studentName: string;
  hostelName?: string;
  bedNumber?: string | number;
  plainReason?: string;
  dietNotes?: string;
  admittedAt: string;
}

interface BoardingLog {
  id: string;
  type: string;
  returnedAt?: string | null;
  reason?: string;
  timestamp: string;
  student?: {
    name?: string;
    hostel?: {
      name?: string;
    } | null;
  } | null;
  authorizedBy?: {
    name?: string;
  } | null;
}

type RollCallSession = 'MORNING' | 'EVENING' | 'LIGHTS_OUT';
type RollCallStatus = 'PRESENT' | 'SICK_BAY' | 'EXEAT' | 'ABSENT';

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string; message?: string }>(err)) {
    return err.response?.data?.error || err.response?.data?.message || fallback;
  }
  return fallback;
}

export default function BoardingManagement() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [students, setStudents] = useState<BoarderStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [signOutData, setSignOutData] = useState({ studentId: '', type: 'SIGN_OUT', reason: '' });

  const boarderStudentOptions = useMemo<ComboboxOption[]>(() => {
    return students.map((s) => ({
      value: s.id,
      label: s.name,
      subLabel: s.studentId,
      badge: 'Student'
    }));
  }, [students]);

  // Requisitions & Approvals state
  const [approvalsTab, setApprovalsTab] = useState<'STAFF' | 'STUDENT_LEADER'>('STUDENT_LEADER');
  const [studentLeaderRequests, setStudentLeaderRequests] = useState<Requisition[]>([]);
  const [staffRequests, setStaffRequests] = useState<Requisition[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedReqForDecline, setSelectedReqForDecline] = useState<Requisition | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Matron Clinic Integration state
  const [boardersInSickBay, setBoardersInSickBay] = useState<SickBayBoarder[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertData, setAlertData] = useState({ studentId: '', notes: '', acuity: 'YELLOW' });
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  // Boarding Movement & Exeat logs state
  const [boardingLogs, setBoardingLogs] = useState<BoardingLog[]>([]);
  const [exeatFilter, setExeatFilter] = useState<'ALL' | 'ACTIVE'>('ACTIVE');
  const [returningLogId, setReturningLogId] = useState<string | null>(null);

  // Roll Call state
  const [, setSearchParams] = useSearchParams();
  const [hostelSearchQuery, setHostelSearchQuery] = useState('');
  const [hostelTypeFilter, setHostelTypeFilter] = useState<'ALL' | 'BOYS' | 'GIRLS' | 'AVAILABLE'>('ALL');
  const [selectedHostelForRooms, setSelectedHostelForRooms] = useState<Hostel | null>(null);

  const [rollCallHostelId, setRollCallHostelId] = useState<string>('ALL');
  const [rollCallSession, setRollCallSession] = useState<RollCallSession>('EVENING');
  const [rollCallDate, setRollCallDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentRollStatuses, setStudentRollStatuses] = useState<Record<string, RollCallStatus>>({});
  const [rollCallSearch, setRollCallSearch] = useState<string>('');
  const [rollCallStatusFilter, setRollCallStatusFilter] = useState<'ALL' | RollCallStatus>('ALL');

  // Meal Deduction Modal state
  const [isMealDeductionModalOpen, setIsMealDeductionModalOpen] = useState(false);
  const [mealDeductionData, setMealDeductionData] = useState({
    mealType: 'DINNER',
    costPerMeal: 1.5,
    actualServedCount: 0,
    notes: ''
  });
  const [isPostingDeduction, setIsPostingDeduction] = useState(false);

  const { showToast } = useToast();

  const fetchBoardingLogs = useCallback(async () => {
    try {
      const res = await api.get('/api/ancillary/boarding/logs');
      setBoardingLogs(res.data || []);
    } catch (e) {
      console.error('Failed to refresh boarding logs', e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [hostelRes, studentRes, clinicRes, logsRes] = await Promise.all([
        api.get('/api/ancillary/hostels'),
        api.get('/api/students').catch(() => ({ data: { students: [] } })),
        api.get('/clinic/matron/boarders').catch(() => ({ data: [] })),
        api.get('/api/ancillary/boarding/logs').catch(() => ({ data: [] }))
      ]);
      setHostels(hostelRes.data || []);
      setStudents(studentRes.data?.students || []);
      setBoardersInSickBay(clinicRes.data || []);
      setBoardingLogs(logsRes.data || []);
    } catch {
      showToast('Failed to load boarding data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchRequisitions = useCallback(async () => {
    try {
      setApprovalsLoading(true);
      const [studentReqsRes, staffReqsRes] = await Promise.all([
        api.get('/api/procurement/requisitions?requesterRole=STUDENT_LEADER'),
        api.get('/api/procurement/requisitions')
      ]);
      
      const allStudent = studentReqsRes.data || [];
      setStudentLeaderRequests(allStudent);

      const allStaff = (staffReqsRes.data || []).filter((r: Requisition) => r.requesterRole !== 'STUDENT_LEADER');
      setStaffRequests(allStaff);
    } catch (err) {
      console.error('Failed to load requisitions', err);
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchRequisitions();
  }, [fetchData, fetchRequisitions]);

  const handleSignOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/ancillary/boarding/log', signOutData);
      showToast('Boarding movement recorded successfully', 'success');
      setIsSignOutModalOpen(false);
      setSignOutData({ studentId: '', type: 'SIGN_OUT', reason: '' });
      fetchBoardingLogs();
    } catch {
      showToast('Failed to record movement', 'error');
    }
  };

  const handleMarkReturned = async (logId: string) => {
    try {
      setReturningLogId(logId);
      await api.patch(`/api/ancillary/boarding/logs/${logId}/return`);
      showToast('Student marked as returned to hostel', 'success');
      fetchBoardingLogs();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update return status'), 'error');
    } finally {
      setReturningLogId(null);
    }
  };

  const handlePostMealDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPostingDeduction(true);
      const res = await api.post('/api/dining-hall/meal-deduction', {
        mealType: mealDeductionData.mealType,
        date: rollCallDate,
        rollCallCount: rollCallSummary.present,
        actualServedCount: mealDeductionData.actualServedCount,
        costPerMeal: mealDeductionData.costPerMeal,
        notes: mealDeductionData.notes
      });
      showToast(`Meal deduction posted! Journal Entry #${res.data.entryNumber || 'posted'} (Variance: ${res.data.variance > 0 ? '+' : ''}${res.data.variance})`, 'success');
      setIsMealDeductionModalOpen(false);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to post meal deduction to ledger'), 'error');
    } finally {
      setIsPostingDeduction(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/procurement/requisitions/${id}/matron-approve`);
      showToast('Student cleaning supplies request approved and forwarded to Admin!', 'success');
      fetchRequisitions();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to approve request'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const openDeclineModal = (req: Requisition) => {
    setSelectedReqForDecline(req);
    setDeclineReason('');
    setDeclineModalOpen(true);
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForDecline) return;

    try {
      setProcessingId(selectedReqForDecline.id);
      await api.post(`/api/procurement/requisitions/${selectedReqForDecline.id}/matron-reject`, {
        reason: declineReason
      });
      showToast('Request declined and student notified.', 'info');
      setDeclineModalOpen(false);
      setSelectedReqForDecline(null);
      fetchRequisitions();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to decline request'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingStudentRequests = studentLeaderRequests.filter(r => r.status === 'PENDING_HOD_BOARDING');

  // Filtered boarders for roll call based on selected hostel
  const boarderStudents = students.filter(s => s.boardingStatus === 'Boarder' || s.hostelId);
  const rollCallStudents = rollCallHostelId === 'ALL'
    ? boarderStudents
    : boarderStudents.filter(s => s.hostelId === rollCallHostelId);

  // Compute roll call counts
  const rollCallSummary = rollCallStudents.reduce((acc, s) => {
    const status = studentRollStatuses[s.id] || 'PRESENT';
    if (status === 'PRESENT') acc.present++;
    else if (status === 'SICK_BAY') acc.sickBay++;
    else if (status === 'EXEAT') acc.exeat++;
    else if (status === 'ABSENT') acc.absent++;
    return acc;
  }, { present: 0, sickBay: 0, exeat: 0, absent: 0 });

  const filteredRollCallStudents = rollCallStudents.filter(s => {
    const status = studentRollStatuses[s.id] || 'PRESENT';
    if (rollCallStatusFilter !== 'ALL' && status !== rollCallStatusFilter) return false;
    if (rollCallSearch.trim()) {
      const q = rollCallSearch.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchId = s.studentId?.toLowerCase().includes(q);
      const matchHostel = s.hostel?.name?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchHostel) return false;
    }
    return true;
  });

  const activeExeats = boardingLogs.filter(l => l.type === 'SIGN_OUT' && !l.returnedAt);

  const handleMarkAllPresent = () => {
    const newStatuses = { ...studentRollStatuses };
    rollCallStudents.forEach(s => {
      // Don't override if student is already in sick bay or on known exeat
      const current = newStatuses[s.id];
      if (current !== 'SICK_BAY' && current !== 'EXEAT') {
        newStatuses[s.id] = 'PRESENT';
      }
    });
    setStudentRollStatuses(newStatuses);
    showToast(`Marked ${rollCallStudents.length} boarders present for this session`, 'info');
  };

  // --- TAB 1: Hostels & Occupancy ---
  const totalCapacity = useMemo(() => {
    return hostels.reduce((sum, h) => sum + (h.capacity || 0), 0);
  }, [hostels]);

  const totalBoardersInRooms = useMemo(() => {
    return hostels.reduce((sum, h) => {
      const roomSum = h.rooms?.reduce((rSum: number, r: HostelRoom) => rSum + (r._count?.students || 0), 0) || 0;
      return sum + roomSum;
    }, 0);
  }, [hostels]);

  const totalBoardersList = useMemo(() => {
    return students.filter(s => (s.boardingStatus || '').toLowerCase() === 'boarder' || s.hostelId || s.hostel?.id).length;
  }, [students]);

  const totalBoarders = Math.max(totalBoardersInRooms, totalBoardersList);
  const availableBeds = Math.max(0, totalCapacity - totalBoarders);
  const overallOccupancyPercent = totalCapacity > 0 ? ((totalBoarders / totalCapacity) * 100).toFixed(1) : '0.0';

  const boysHostelsCount = useMemo(() => {
    return hostels.filter(h => (h.type || '').toUpperCase() === 'BOYS').length;
  }, [hostels]);

  const girlsHostelsCount = useMemo(() => {
    return hostels.filter(h => (h.type || '').toUpperCase() === 'GIRLS').length;
  }, [hostels]);

  const availableHostelsCount = useMemo(() => {
    return hostels.filter(h => {
      const occ = h.rooms?.reduce((acc: number, r: HostelRoom) => acc + (r._count?.students || 0), 0) || 0;
      return occ < h.capacity;
    }).length;
  }, [hostels]);

  const filteredHostels = useMemo(() => {
    let list = hostels;
    if (hostelTypeFilter === 'BOYS') {
      list = list.filter(h => (h.type || '').toUpperCase() === 'BOYS');
    } else if (hostelTypeFilter === 'GIRLS') {
      list = list.filter(h => (h.type || '').toUpperCase() === 'GIRLS');
    } else if (hostelTypeFilter === 'AVAILABLE') {
      list = list.filter(h => {
        const occ = h.rooms?.reduce((acc: number, r: HostelRoom) => acc + (r._count?.students || 0), 0) || 0;
        return occ < h.capacity;
      });
    }

    if (hostelSearchQuery.trim()) {
      const q = hostelSearchQuery.toLowerCase().trim();
      list = list.filter(h =>
        h.name.toLowerCase().includes(q) ||
        (h.type || '').toLowerCase().includes(q) ||
        (h.warden?.name || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [hostels, hostelTypeFilter, hostelSearchQuery]);

  const occupancyContent = (
    <div>
      {/* 1. EXECUTIVE ACTION HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-hotel" style={{ color: '#0284c7' }}></i>
            Hostel Facilities & Boarder Welfare
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Campus bed allocations, matron supervision, welfare movements, and active boarding capacity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}
          >
            <i className="fas fa-sign-out-alt"></i> Record Student Movement
          </button>

          <button
            onClick={() => setIsAlertModalOpen(true)}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-ambulance"></i> Matron Clinic Alert
          </button>

          <button
            onClick={() => setSearchParams({ tab: 'rollcall' })}
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-clipboard-check"></i> Dorm Roll Call
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE 4-CARD METRIC GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Card 1: Active Hostels */}
        <div
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #0284c7',
            borderRadius: 16,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Hostels
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0369a1', margin: '4px 0 2px' }}>
              {hostels.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {boysHostelsCount} Boys · {girlsHostelsCount} Girls Blocks
            </div>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            <i className="fas fa-hotel"></i>
          </div>
        </div>

        {/* Card 2: Resident Boarders */}
        <div
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #10b981',
            borderRadius: 16,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resident Boarders
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '4px 0 2px' }}>
              {totalBoarders}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Active residential students
            </div>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#d1fae5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            <i className="fas fa-users"></i>
          </div>
        </div>

        {/* Card 3: Bed Capacity & Availability */}
        <div
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 16,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Beds
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', margin: '4px 0 2px' }}>
              {availableBeds} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8' }}>/ {totalCapacity}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {availableBeds > 0 ? `${availableBeds} beds ready for intake` : 'All dorms at max capacity'}
            </div>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            <i className="fas fa-bed"></i>
          </div>
        </div>

        {/* Card 4: Occupancy Rate */}
        <div
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #8b5cf6',
            borderRadius: 16,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Campus Occupancy
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#7c3aed', margin: '4px 0 2px' }}>
                {overallOccupancyPercent}%
              </div>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}
            >
              <i className="fas fa-chart-pie"></i>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(3, parseFloat(overallOccupancyPercent)))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)',
                  borderRadius: 4
                }}
              ></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
              <span>{totalBoarders} occupied</span>
              <span>{totalCapacity} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HOSTEL OVERVIEW & ALLOCATION ROSTER */}
      <div
        className="portal-card"
        style={{
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.03)',
          background: '#ffffff',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Table Control Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-building" style={{ color: '#0284c7' }}></i>
              Hostel Overview & Accommodation Status
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Showing {filteredHostels.length} of {hostels.length} resident hostels
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.82rem' }}></i>
              <input
                type="text"
                placeholder="Search hostel or warden..."
                value={hostelSearchQuery}
                onChange={e => setHostelSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  minWidth: 200
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              <button
                type="button"
                onClick={() => setHostelTypeFilter('ALL')}
                style={{
                  background: hostelTypeFilter === 'ALL' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: hostelTypeFilter === 'ALL' ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: hostelTypeFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                All ({hostels.length})
              </button>
              <button
                type="button"
                onClick={() => setHostelTypeFilter('BOYS')}
                style={{
                  background: hostelTypeFilter === 'BOYS' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: hostelTypeFilter === 'BOYS' ? '#0284c7' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: hostelTypeFilter === 'BOYS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Boys ({boysHostelsCount})
              </button>
              <button
                type="button"
                onClick={() => setHostelTypeFilter('GIRLS')}
                style={{
                  background: hostelTypeFilter === 'GIRLS' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: hostelTypeFilter === 'GIRLS' ? '#be185d' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: hostelTypeFilter === 'GIRLS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Girls ({girlsHostelsCount})
              </button>
              <button
                type="button"
                onClick={() => setHostelTypeFilter('AVAILABLE')}
                style={{
                  background: hostelTypeFilter === 'AVAILABLE' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: hostelTypeFilter === 'AVAILABLE' ? '#059669' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: hostelTypeFilter === 'AVAILABLE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Available ({availableHostelsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24 }}><SkeletonLoader type="table" rows={4} columns={6} /></div>
          ) : (
            <PaginatedTable className="portal-table">
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Hostel Name</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Warden / Matron</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Occupancy & Capacity</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Rooms</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHostels.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <i className="fas fa-hotel" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: 10, display: 'block' }}></i>
                      <div style={{ fontWeight: 700, color: '#334155' }}>No hostels match the selected filters</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>Try clearing the search or filter chips</div>
                    </td>
                  </tr>
                ) : (
                  filteredHostels.map(h => {
                    const currentOccupancy = h.rooms?.reduce((acc: number, r: HostelRoom) => acc + (r._count?.students || 0), 0) || 0;
                    const isFull = currentOccupancy >= h.capacity;
                    const occPct = h.capacity > 0 ? Math.min(100, Math.round((currentOccupancy / h.capacity) * 100)) : 0;
                    const isBoys = (h.type || '').toUpperCase() === 'BOYS';
                    const initials = h.name.slice(0, 2).toUpperCase();

                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Hostel Name with Initials Avatar */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: isBoys ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                flexShrink: 0
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>{h.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                {h.rooms?.length || 0} registered rooms
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Gender / Demographic */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              background: isBoys ? '#e0f2fe' : '#fce7f3',
                              color: isBoys ? '#0284c7' : '#be185d',
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <i className={isBoys ? 'fas fa-mars' : 'fas fa-venus'}></i>
                            {h.type}
                          </span>
                        </td>

                        {/* Warden / Matron */}
                        <td style={{ padding: '14px 18px' }}>
                          {h.warden ? (
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <i className="fas fa-user-shield"></i>
                              {h.warden.name}
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <i className="fas fa-exclamation-triangle"></i>
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Occupancy & Progress Bar */}
                        <td style={{ padding: '14px 18px', minWidth: 160 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                              {currentOccupancy} <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>/ {h.capacity} beds</span>
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isFull ? '#dc2626' : '#059669' }}>
                              {occPct}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.max(2, occPct)}%`,
                                height: '100%',
                                background: isFull ? '#ef4444' : occPct > 80 ? '#f59e0b' : '#10b981',
                                borderRadius: 3
                              }}
                            ></div>
                          </div>
                        </td>

                        {/* Rooms Count Badge */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#334155',
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <i className="fas fa-door-closed" style={{ color: '#94a3b8' }}></i>
                            {h.rooms?.length || 0} rooms
                          </span>
                        </td>

                        {/* Operational Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              background: isFull ? '#fee2e2' : '#d1fae5',
                              color: isFull ? '#dc2626' : '#059669',
                              border: `1px solid ${isFull ? '#fecaca' : '#a7f3d0'}`,
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}
                          >
                            {isFull ? 'FULL' : 'AVAILABLE'}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedHostelForRooms(h)}
                              style={{
                                background: '#f1f5f9',
                                color: '#0f172a',
                                border: '1px solid #cbd5e1',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <i className="fas fa-door-open" style={{ color: '#0284c7' }}></i>
                              Rooms
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRollCallHostelId(h.id);
                                setSearchParams({ tab: 'rollcall' });
                              }}
                              style={{
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <i className="fas fa-clipboard-check"></i>
                              Roll Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </PaginatedTable>
          )}
        </div>
      </div>
    </div>
  );

  // --- TAB 2: Supplies Approvals (with Sub-tab A and Sub-tab B) ---
  const approvalsContent = (
    <div className="portal-card">
      <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Boarding Supplies & Requisition Approvals</h2>
          <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>Review student leader cleaning requests and staff boarding requisitions.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`portal-btn ${approvalsTab === 'STUDENT_LEADER' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
            onClick={() => setApprovalsTab('STUDENT_LEADER')}
          >
            <i className="fas fa-soap mr-2"></i>
            Student Leader Requests
            {pendingStudentRequests.length > 0 && (
              <span className="badge bg-danger ml-2" style={{ marginLeft: 8, padding: '2px 8px', borderRadius: '12px' }}>
                {pendingStudentRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`portal-btn ${approvalsTab === 'STAFF' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
            onClick={() => setApprovalsTab('STAFF')}
          >
            <i className="fas fa-user-tie mr-2"></i>
            Staff Requests
          </button>
        </div>
      </div>

      <div className="portal-card-body p-0">
        {approvalsLoading ? (
          <div style={{ padding: '1.5rem' }}>
            <SkeletonLoader type="table" rows={5} columns={6} />
          </div>
        ) : approvalsTab === 'STUDENT_LEADER' ? (
          // Sub-tab B: Student Leader Requests
          <div className="table-responsive">
            <PaginatedTable className="portal-table">
              <thead>
                <tr>
                  <th>Prefect / Leader</th>
                  <th>Hostel</th>
                  <th>Supplies Requested</th>
                  <th>Justification / Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentLeaderRequests.map(req => {
                  const isPending = req.status === 'PENDING_HOD_BOARDING';
                  return (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.requestedByStudent?.name || req.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                          Ref: {req.refNumber}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className="fas fa-hotel mr-1 text-primary"></i>
                          {req.hostelReq?.name || 'Hostel'}
                        </span>
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem' }}>
                          {Array.isArray(req.items) && req.items.map((i: RequisitionItem, idx: number) => (
                            <li key={idx}><strong>{i.quantity}x</strong> {i.name || i.itemName}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                          {req.description || '-'}
                        </span>
                      </td>
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${req.status === 'PENDING_HOD_BOARDING' ? 'bg-warning text-dark' : req.status === 'REJECTED' ? 'bg-danger text-white' : 'bg-info text-white'}`} style={{ padding: '4px 8px' }}>
                          {req.status === 'PENDING_HOD_BOARDING' ? 'Waiting Matron Approval' : req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="portal-btn-success btn-sm"
                              disabled={processingId === req.id}
                              onClick={() => handleApprove(req.id)}
                              title="Approve and forward to Admin"
                            >
                              <i className="fas fa-check mr-1"></i> Approve
                            </button>
                            <button
                              className="portal-btn-danger btn-sm"
                              disabled={processingId === req.id}
                              onClick={() => openDeclineModal(req)}
                              title="Decline request"
                            >
                              <i className="fas fa-times mr-1"></i> Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {studentLeaderRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>
                      <i className="fas fa-check-circle fa-2x mb-2 text-success d-block"></i>
                      No student leader cleaning requests currently pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </PaginatedTable>
          </div>
        ) : (
          // Sub-tab A: Staff Requests
          <div className="table-responsive">
            <PaginatedTable className="portal-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Title</th>
                  <th>Requested By</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {staffRequests.map(req => (
                  <tr key={req.id}>
                    <td><strong>{req.refNumber}</strong></td>
                    <td>{req.title}</td>
                    <td>{req.requester?.name || 'Staff'}</td>
                    <td>{req.department?.name || 'Boarding'}</td>
                    <td>${req.estimatedAmount?.toFixed(2) || '0.00'}</td>
                    <td>
                      <span className="badge bg-secondary">{req.status}</span>
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {staffRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>
                      No staff boarding requisitions logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </PaginatedTable>
          </div>
        )}
      </div>
    </div>
  );

  const handleSendClinicAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertData.studentId) return;
    try {
      setAlertSubmitting(true);
      await api.post('/clinic/matron/alert', alertData);
      showToast('Health alert transmitted to clinic staff immediately', 'success');
      setIsAlertModalOpen(false);
      setAlertData({ studentId: '', notes: '', acuity: 'YELLOW' });
      const res = await api.get('/clinic/matron/boarders').catch(() => ({ data: [] }));
      setBoardersInSickBay(res.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to send alert'), 'error');
    } finally {
      setAlertSubmitting(false);
    }
  };

  const clinicContent = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>Boarders in Sick Bay</h3>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '0.9rem' }}>
            Boarding students currently admitted or under clinical observation.
          </p>
        </div>
        <button
          onClick={() => setIsAlertModalOpen(true)}
          className="portal-btn-primary"
          style={{ background: '#e53e3e', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <i className="fas fa-bell"></i> Send Clinic Alert / Referral
        </button>
      </div>

      {boardersInSickBay.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
          <i className="fas fa-heartbeat" style={{ fontSize: '2.5rem', color: '#48bb78', marginBottom: 12 }}></i>
          <p style={{ fontWeight: 600 }}>All boarders are currently in their hostels.</p>
          <p style={{ fontSize: '0.85rem' }}>No boarding students are admitted to the sick bay.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <PaginatedTable className="portal-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Hostel / Bed</th>
                <th>Reason / Condition</th>
                <th>Diet / Special Needs</th>
                <th>Admitted At</th>
              </tr>
            </thead>
            <tbody>
              {boardersInSickBay.map((item: SickBayBoarder, idx: number) => (
                <tr key={idx}>
                  <td><strong>{item.studentName}</strong></td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {item.hostelName || 'Hostel'} — {item.bedNumber}
                    </span>
                  </td>
                  <td>{item.plainReason || 'Health consultation'}</td>
                  <td>
                    {item.dietNotes ? (
                      <span className="badge bg-warning text-dark">{item.dietNotes}</span>
                    ) : (
                      <span className="text-muted">Standard diet</span>
                    )}
                  </td>
                  <td>{new Date(item.admittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </PaginatedTable>
        </div>
      )}
    </div>
  );

  // --- TAB: Dorm Roll Call ---
  const rollCallContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Configuration Toolbar */}
      <div
        className="portal-card"
        style={{
          background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '24px 28px',
          boxShadow: '0 8px 24px -4px rgba(12, 35, 64, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'rgba(255, 255, 255, 0.18)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  color: '#e0f2fe',
                }}
              >
                <i className="fas fa-bed" style={{ marginRight: '5px' }} />
                Residential Boarding Operations
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: '#10b981',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  color: '#ffffff',
                }}
              >
                Headcount Inspection
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>
              Dormitory Roll Call & Night Inspection
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#bae6fd' }}>
              Verify boarder residential presence, record health sick bay cases, and reconcile headcount with dining hall rations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }} className="no-print">
            <button
              onClick={handleMarkAllPresent}
              type="button"
              style={{
                background: '#ffffff',
                color: '#0369a1',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '9px 18px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <i className="fas fa-check-double text-success" />
              Mark All Present
            </button>

            <button
              onClick={() => {
                setMealDeductionData(prev => ({
                  ...prev,
                  actualServedCount: rollCallSummary.present
                }));
                setIsMealDeductionModalOpen(true);
              }}
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '9px 16px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
              }}
            >
              <i className="fas fa-utensils" />
              Sync Dining Rations
            </button>

            <button
              onClick={() => showToast(`Roll call snapshot recorded for ${rollCallSession} on ${rollCallDate}`, 'success')}
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '9px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fas fa-save" />
              Save Check
            </button>
          </div>
        </div>

        {/* Filters Strip */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'rgba(0, 0, 0, 0.22)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#bae6fd', textTransform: 'uppercase' }}>
              Hostel / Dormitory
            </label>
            <select
              className="portal-input"
              value={rollCallHostelId}
              onChange={e => setRollCallHostelId(e.target.value)}
              style={{
                margin: 0,
                height: '38px',
                minWidth: '200px',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: '#ffffff',
                color: '#0f172a',
              }}
            >
              <option value="ALL">All Hostels ({boarderStudents.length} Boarders)</option>
              {hostels.map(h => {
                const countInHostel = boarderStudents.filter(s => s.hostelId === h.id).length;
                return (
                  <option key={h.id} value={h.id}>
                    {h.name} ({countInHostel} students)
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#bae6fd', textTransform: 'uppercase' }}>
              Inspection Session
            </label>
            <select
              className="portal-input"
              value={rollCallSession}
              onChange={e => setRollCallSession(e.target.value as RollCallSession)}
              style={{
                margin: 0,
                height: '38px',
                minWidth: '190px',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: '#ffffff',
                color: '#0f172a',
              }}
            >
              <option value="MORNING">🌅 Morning Check (06:30)</option>
              <option value="EVENING">🌆 Evening Roll Call (18:30)</option>
              <option value="LIGHTS_OUT">🌙 Lights Out Inspection (21:30)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#bae6fd', textTransform: 'uppercase' }}>
              Date
            </label>
            <input
              type="date"
              className="portal-input"
              value={rollCallDate}
              onChange={e => setRollCallDate(e.target.value)}
              style={{
                margin: 0,
                height: '38px',
                width: '160px',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: '#ffffff',
                color: '#0f172a',
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Stat Cards (Grid Layout) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
        className="no-print"
      >
        {[
          {
            id: 'PRESENT',
            label: 'Present in Dorms',
            value: rollCallSummary.present,
            subtext: `${rollCallStudents.length > 0 ? Math.round((rollCallSummary.present / rollCallStudents.length) * 100) : 0}% headcount present`,
            icon: 'fa-bed',
            color: '#059669',
            bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '#a7f3d0',
            badgeBg: '#a7f3d0',
          },
          {
            id: 'SICK_BAY',
            label: 'In Sick Bay',
            value: rollCallSummary.sickBay,
            subtext: 'Under clinic medical observation',
            icon: 'fa-clinic-medical',
            color: '#d97706',
            bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '#fde68a',
            badgeBg: '#fde68a',
          },
          {
            id: 'EXEAT',
            label: 'On Approved Exeat',
            value: rollCallSummary.exeat,
            subtext: 'Authorized off-campus movement',
            icon: 'fa-walking',
            color: '#0284c7',
            bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '#bfdbfe',
            badgeBg: '#bfdbfe',
          },
          {
            id: 'ABSENT',
            label: 'Unaccounted / Absent',
            value: rollCallSummary.absent,
            subtext: 'Requires immediate warden verification',
            icon: 'fa-exclamation-triangle',
            color: '#dc2626',
            bg: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
            border: '#fecdd3',
            badgeBg: '#fecdd3',
          },
        ].map(card => {
          const isSelected = rollCallStatusFilter === card.id;
          return (
            <div
              key={card.id}
              onClick={() => setRollCallStatusFilter(rollCallStatusFilter === card.id ? 'ALL' : (card.id as RollCallStatus))}
              style={{
                background: card.bg,
                border: isSelected ? `2px solid ${card.color}` : `1px solid ${card.border}`,
                boxShadow: isSelected
                  ? `0 8px 20px -2px rgba(0, 0, 0, 0.12), 0 0 0 3px ${card.color}22`
                  : '0 2px 8px rgba(0,0,0,0.02)',
                borderRadius: '16px',
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                  {card.label}
                </span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: card.badgeBg,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}
                >
                  <i className={`fas ${card.icon}`} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div
        className="portal-card no-print"
        style={{
          padding: '14px 20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: '#ffffff',
          borderRadius: '14px',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              className="portal-input"
              placeholder="Search boarders by student name, ID, or hostel..."
              value={rollCallSearch}
              onChange={e => setRollCallSearch(e.target.value)}
              style={{ margin: 0, paddingLeft: '36px', height: '40px' }}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { id: 'ALL', label: `All (${rollCallStudents.length})` },
            { id: 'PRESENT', label: `Present (${rollCallSummary.present})` },
            { id: 'SICK_BAY', label: `Sick Bay (${rollCallSummary.sickBay})` },
            { id: 'EXEAT', label: `Exeat (${rollCallSummary.exeat})` },
            { id: 'ABSENT', label: `Absent (${rollCallSummary.absent})` },
          ] as { id: 'ALL' | RollCallStatus; label: string }[]).map(f => {
            const active = rollCallStatusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setRollCallStatusFilter(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: active ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: active ? '#e0f2fe' : '#f8fafc',
                  color: active ? '#0369a1' : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            );
          })}

          {(rollCallSearch || rollCallStatusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setRollCallSearch('');
                setRollCallStatusFilter('ALL');
              }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-times mr-1" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Roster Table Card */}
      <div className="portal-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-list-ol mr-2" style={{ color: '#0284c7' }} />
              Boarder Roll Call Roster ({filteredRollCallStudents.length} of {rollCallStudents.length})
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Session: <strong>{rollCallSession}</strong> | Date: <strong>{rollCallDate}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Quick Status Legend:
            </span>
            <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Present
            </span>
            <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Sick Bay
            </span>
            <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Exeat
            </span>
            <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Absent
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <PaginatedTable className="portal-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Boarder Student</th>
                <th style={{ minWidth: '140px' }}>Admission / ID</th>
                <th style={{ minWidth: '180px' }}>Hostel Assignment</th>
                <th style={{ minWidth: '130px' }}>Current Status</th>
                <th style={{ minWidth: '320px', textAlign: 'right' }}>Quick Action Switch</th>
              </tr>
            </thead>
            <tbody>
              {filteredRollCallStudents.map(student => {
                const currentStatus = studentRollStatuses[student.id] || 'PRESENT';
                return (
                  <tr
                    key={student.id}
                    style={{
                      background: currentStatus === 'ABSENT' ? '#fff5f5' : undefined,
                      transition: 'background 0.2s',
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{student.name}</strong>
                          {student.class?.name && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {student.class.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <code
                        style={{
                          fontSize: '0.8rem',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          color: '#334155',
                          fontWeight: 700,
                        }}
                      >
                        {student.studentId}
                      </code>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
                        {student.hostel?.name || 'Mandela Hall'}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#0284c7',
                          background: '#f0f9ff',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        Room {student.roomNumber || 'General Dorm'} • Bed {student.bedNumber || '1'}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background:
                            currentStatus === 'PRESENT'
                              ? '#dcfce7'
                              : currentStatus === 'SICK_BAY'
                              ? '#fef3c7'
                              : currentStatus === 'EXEAT'
                              ? '#dbeafe'
                              : '#fee2e2',
                          color:
                            currentStatus === 'PRESENT'
                              ? '#15803d'
                              : currentStatus === 'SICK_BAY'
                              ? '#b45309'
                              : currentStatus === 'EXEAT'
                              ? '#1e40af'
                              : '#b91c1c',
                        }}
                      >
                        <i
                          className={
                            currentStatus === 'PRESENT'
                              ? 'fas fa-check-circle'
                              : currentStatus === 'SICK_BAY'
                              ? 'fas fa-clinic-medical'
                              : currentStatus === 'EXEAT'
                              ? 'fas fa-walking'
                              : 'fas fa-exclamation-circle'
                          }
                          style={{ fontSize: '0.7rem' }}
                        />
                        {currentStatus === 'PRESENT'
                          ? 'Present'
                          : currentStatus === 'SICK_BAY'
                          ? 'Sick Bay'
                          : currentStatus === 'EXEAT'
                          ? 'On Exeat'
                          : 'Unaccounted'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          background: '#f1f5f9',
                          padding: '3px',
                          borderRadius: '8px',
                          gap: '3px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'PRESENT' })}
                          style={{
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: currentStatus === 'PRESENT' ? '#10b981' : 'transparent',
                            color: currentStatus === 'PRESENT' ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'SICK_BAY' })}
                          style={{
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: currentStatus === 'SICK_BAY' ? '#f59e0b' : 'transparent',
                            color: currentStatus === 'SICK_BAY' ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          Sick Bay
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'EXEAT' })}
                          style={{
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: currentStatus === 'EXEAT' ? '#0284c7' : 'transparent',
                            color: currentStatus === 'EXEAT' ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          Exeat
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'ABSENT' })}
                          style={{
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: currentStatus === 'ABSENT' ? '#ef4444' : 'transparent',
                            color: currentStatus === 'ABSENT' ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRollCallStudents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <i className="fas fa-bed" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '10px', display: 'block' }} />
                    <strong style={{ display: 'block', color: '#334155', fontSize: '0.95rem' }}>
                      {rollCallStudents.length === 0
                        ? 'No boarder students assigned to the selected hostel.'
                        : 'No boarders match your active search or status filter.'}
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {rollCallStudents.length === 0
                        ? 'Assign students to hostels in the Occupancy tab to begin dormitory roll calls.'
                        : 'Try adjusting your search query or reset status filters.'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </PaginatedTable>
        </div>
      </div>
    </div>
  );

  // --- TAB: Exeat & Movements ---
  const displayedLogs = exeatFilter === 'ACTIVE'
    ? boardingLogs.filter(l => l.type === 'SIGN_OUT' && !l.returnedAt)
    : boardingLogs;

  const exeatContent = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>Exeat & Student Movements Register</h3>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '0.9rem' }}>
            Gate pass authorization, sign-out tracking, and real-time campus departure status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid #cbd5e0', borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setExeatFilter('ACTIVE')}
              className={`portal-btn-sm ${exeatFilter === 'ACTIVE' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
            >
              Active Exeats ({activeExeats.length})
            </button>
            <button
              onClick={() => setExeatFilter('ALL')}
              className={`portal-btn-sm ${exeatFilter === 'ALL' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
            >
              Full History ({boardingLogs.length})
            </button>
          </div>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="portal-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-sign-out-alt"></i> Issue Exeat / Movement Pass
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <PaginatedTable className="portal-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Hostel</th>
              <th>Movement Type</th>
              <th>Reason / Destination</th>
              <th>Departed At</th>
              <th>Return Status</th>
              <th>Authorized By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log: BoardingLog) => {
              const isReturned = !!log.returnedAt;
              return (
                <tr key={log.id}>
                  <td><strong>{log.student?.name || 'Student'}</strong></td>
                  <td>{log.student?.hostel?.name || 'Boarder'}</td>
                  <td>
                    <span className={`portal-badge ${
                      log.type === 'SIGN_OUT' ? 'warning' :
                      log.type === 'SIGN_IN' ? 'success' :
                      log.type === 'SICK_BAY' ? 'info' : 'secondary'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td>{log.reason || 'No reason provided'}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>
                    {log.returnedAt ? (
                      <span className="portal-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-check-circle"></i> Returned ({new Date(log.returnedAt).toLocaleTimeString()})
                      </span>
                    ) : (
                      <span className="portal-badge error" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-clock"></i> Outside Campus
                      </span>
                    )}
                  </td>
                  <td>{log.authorizedBy?.name || 'Staff'}</td>
                  <td>
                    {!isReturned && log.type === 'SIGN_OUT' ? (
                      <button
                        onClick={() => handleMarkReturned(log.id)}
                        disabled={returningLogId === log.id}
                        className="portal-btn-secondary portal-btn-sm text-success"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <i className="fas fa-check"></i>
                        {returningLogId === log.id ? 'Updating...' : 'Mark Returned'}
                      </button>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>Closed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {displayedLogs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                  {exeatFilter === 'ACTIVE'
                    ? 'No students currently outside campus on exeat.'
                    : 'No movement logs found.'}
                </td>
              </tr>
            )}
          </tbody>
        </PaginatedTable>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'occupancy', label: 'Hostel Occupancy & Welfare', icon: 'fas fa-hotel', content: occupancyContent },
    { 
      id: 'rollcall', 
      label: 'Dorm Roll Call', 
      icon: 'fas fa-clipboard-check', 
      content: rollCallContent 
    },
    { 
      id: 'exeat', 
      label: 'Exeat & Movements', 
      icon: 'fas fa-id-badge', 
      badge: activeExeats.length > 0 ? activeExeats.length : undefined, 
      content: exeatContent 
    },
    { 
      id: 'approvals', 
      label: 'Supplies Approvals', 
      icon: 'fas fa-tasks', 
      badge: pendingStudentRequests.length > 0 ? pendingStudentRequests.length : undefined, 
      content: approvalsContent 
    },
    { 
      id: 'clinic', 
      label: 'Sick Bay & Health', 
      icon: 'fas fa-heartbeat', 
      badge: boardersInSickBay.length > 0 ? boardersInSickBay.length : undefined, 
      content: clinicContent 
    }
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Boarding Management & Supplies</h1>
        <p>Hostel occupancy tracking, boarding welfare movements, and student leader supplies approval.</p>
      </div>

      <TabbedPage
        title="Boarding Administration"
        subtitle="Manage resident hostels and process cleaning supplies requisitions"
        tabs={tabs}
        defaultTab="occupancy"
      />

      {/* Movement Modal */}
      {isSignOutModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Record Student Movement</h2>
              <button onClick={() => setIsSignOutModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSignOut} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <SearchableCombobox
                  label="Select Student"
                  required
                  placeholder="Select or search boarder student..."
                  searchPlaceholder="Type student name or ID..."
                  options={boarderStudentOptions}
                  value={signOutData.studentId}
                  onChange={(val: string) => setSignOutData({ ...signOutData, studentId: val })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Movement Type</label>
                <select 
                  className="form-control portal-input"
                  value={signOutData.type}
                  onChange={e => setSignOutData({...signOutData, type: e.target.value})}
                >
                  <option value="SIGN_OUT">Sign Out (Exiting School)</option>
                  <option value="SIGN_IN">Sign In (Returning)</option>
                  <option value="SICK_BAY">Moved to Sick Bay</option>
                  <option value="DISCIPLINE">Disciplinary Action</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Reason / Notes</label>
                <textarea 
                  className="form-control portal-input"
                  value={signOutData.reason}
                  onChange={e => setSignOutData({...signOutData, reason: e.target.value})}
                  rows={3}
                  placeholder="e.g. Weekend Pass, Hospital Visit, Returned from holiday"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsSignOutModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Record Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Decline Supplies Request</h2>
              <button onClick={() => setDeclineModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleDeclineSubmit} style={{ padding: 20 }}>
              <p style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: 12 }}>
                Please provide a constructive reason for declining the request from <strong>{selectedReqForDecline?.requestedByStudent?.name || 'Student Leader'}</strong>. The student will be able to see this reason.
              </p>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Decline Reason</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  required
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  placeholder="e.g. Current hostel stock sufficient for this week. Please re-apply next Tuesday."
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setDeclineModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-danger" disabled={processingId === selectedReqForDecline?.id}>
                  {processingId === selectedReqForDecline?.id ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matron Clinic Alert Modal */}
      {isAlertModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2><i className="fas fa-bell text-danger mr-2"></i>Send Matron Clinic Alert</h2>
              <button onClick={() => setIsAlertModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSendClinicAlert} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Unwell Boarding Student</label>
                <select
                  className="portal-input"
                  required
                  value={alertData.studentId}
                  onChange={e => setAlertData({ ...alertData, studentId: e.target.value })}
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Urgency / Acuity</label>
                <select
                  className="portal-input"
                  value={alertData.acuity}
                  onChange={e => setAlertData({ ...alertData, acuity: e.target.value })}
                >
                  <option value="YELLOW">Yellow (Elevated Temperature / Feeling Sick)</option>
                  <option value="RED">Red (Severe Pain / Injury / Respiratory Distress)</option>
                  <option value="GREEN">Green (Routine Review / Non-Urgent)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Observations & Symptoms</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  required
                  placeholder="e.g. Complained of intense stomach ache after lights out, vomiting twice..."
                  value={alertData.notes}
                  onChange={e => setAlertData({ ...alertData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsAlertModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#e53e3e' }} disabled={alertSubmitting}>
                  {alertSubmitting ? 'Transmitting...' : 'Send Alert to Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meal Deduction & Headcount Sync Modal */}
      {isMealDeductionModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2><i className="fas fa-utensils text-primary mr-2"></i>Dining Hall Meal Deduction</h2>
              <button onClick={() => setIsMealDeductionModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handlePostMealDeduction} style={{ padding: 20 }}>
              <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>Roll Call Present Headcount:</span>
                  <strong>{rollCallSummary.present} students</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>Active Hostels Included:</span>
                  <strong>{rollCallHostelId === 'ALL' ? 'All Hostels' : hostels.find(h => h.id === rollCallHostelId)?.name || 'Hostel'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>General Ledger Posting:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2b6cb0' }}>DR 5030 / CR 1220</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Meal Service</label>
                <select
                  className="portal-input"
                  value={mealDeductionData.mealType}
                  onChange={e => setMealDeductionData({ ...mealDeductionData, mealType: e.target.value })}
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner / Supper</option>
                </select>
              </div>

              <div className="portal-grid-2" style={{ marginBottom: 15 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Actual Meals Served</label>
                  <input
                    type="number"
                    min="0"
                    className="portal-input"
                    value={mealDeductionData.actualServedCount}
                    onChange={e => setMealDeductionData({ ...mealDeductionData, actualServedCount: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="portal-input"
                    value={mealDeductionData.costPerMeal}
                    onChange={e => setMealDeductionData({ ...mealDeductionData, costPerMeal: parseFloat(e.target.value) || 1.5 })}
                    required
                  />
                </div>
              </div>

              {/* Headcount Variance Calculation Box */}
              {(() => {
                const variance = mealDeductionData.actualServedCount - rollCallSummary.present;
                const totalCost = (mealDeductionData.actualServedCount * mealDeductionData.costPerMeal).toFixed(2);
                return (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 16,
                    background: variance === 0 ? '#f0fff4' : variance > 0 ? '#fffaf0' : '#fff5f5',
                    border: `1px solid ${variance === 0 ? '#c6f6d5' : variance > 0 ? '#feebc8' : '#fed7d7'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {variance === 0 ? '✓ Headcount Matches Roll Call' :
                         variance > 0 ? `⚠ Variance: +${variance} Extra Meals Served` :
                         `⚠ Variance: ${variance} Fewer Meals Served`}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#2d3748' }}>${totalCost}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Kitchen / Service Notes</label>
                <textarea
                  className="portal-input"
                  rows={2}
                  placeholder="e.g. Extra portions served to sports team..."
                  value={mealDeductionData.notes}
                  onChange={e => setMealDeductionData({ ...mealDeductionData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsMealDeductionModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={isPostingDeduction}>
                  {isPostingDeduction ? 'Posting Journal...' : 'Post Inventory Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hostel Rooms Breakdown Modal */}
      {selectedHostelForRooms && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 620 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-door-open" style={{ color: '#0284c7' }}></i>
                  {selectedHostelForRooms.name} — Room Allocations
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {selectedHostelForRooms.type} Hostel · {selectedHostelForRooms.rooms?.length || 0} Registered Rooms · Capacity: {selectedHostelForRooms.capacity} Beds
                </p>
              </div>
              <button onClick={() => setSelectedHostelForRooms(null)} className="close-modal">&times;</button>
            </div>
            <div style={{ padding: 20 }}>
              {!selectedHostelForRooms.rooms || selectedHostelForRooms.rooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  <i className="fas fa-door-closed" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: 10 }}></i>
                  <p style={{ margin: 0, fontWeight: 600 }}>No individual rooms configured for this hostel block.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Rooms can be configured by the school administrator.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedHostelForRooms.rooms.map((room, idx) => {
                    const roomCapacity = room.capacity || 10;
                    const roomOcc = room._count?.students || 0;
                    const freeBeds = Math.max(0, roomCapacity - roomOcc);
                    const isFull = roomOcc >= roomCapacity;
                    const pct = Math.min(100, Math.round((roomOcc / roomCapacity) * 100));

                    return (
                      <div
                        key={room.id || idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: isFull ? '#fee2e2' : '#e0f2fe',
                              color: isFull ? '#dc2626' : '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem'
                            }}
                          >
                            <i className="fas fa-bed"></i>
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                              {room.name || `Room #${idx + 1}`}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Capacity: {roomCapacity} beds · {freeBeds} available
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 160 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                              <span>{roomOcc} Students</span>
                              <span>{pct}%</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: isFull ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981',
                                  borderRadius: 3
                                }}
                              ></div>
                            </div>
                          </div>

                          <span
                            style={{
                              background: isFull ? '#fee2e2' : '#d1fae5',
                              color: isFull ? '#dc2626' : '#059669',
                              border: `1px solid ${isFull ? '#fecaca' : '#a7f3d0'}`,
                              padding: '3px 8px',
                              borderRadius: 8,
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}
                          >
                            {isFull ? 'FULL' : 'OPEN'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setSelectedHostelForRooms(null)}
                  className="portal-btn-secondary"
                  style={{ borderRadius: 8, padding: '8px 18px', fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
