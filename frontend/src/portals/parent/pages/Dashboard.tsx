import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, LinkedEntity } from '../../../contexts/AuthContext';
import api, { BASE_URL } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

// ── TYPES ──

interface DashboardSummary {
  child: {
    id: string;
    studentId: string;
    name: string;
    className: string;
    houseName: string | null;
    avatar: string | null;
    schoolName?: string;
    schoolCode?: string;
  };
  fees: {
    balanceDue: number;
    currency: string;
    currencySymbol: string;
    dueDate: string | null;
    daysOverdue: number;
    statusColor: 'RED' | 'AMBER' | 'GREEN';
    overdueText: string | null;
    isOverdue: boolean;
    canPayNow: boolean;
  };
  academics: {
    termName: string;
    currentAverage: number;
    previousAverage: number;
    trendArrow: 'up' | 'down' | 'flat';
    latestAssessment: string;
    latestScore: number;
  };
  attendance: {
    presentPercent: number;
    absentDays: number;
    lateDays: number;
    todayStatus: string;
    statusColor: 'RED' | 'AMBER' | 'GREEN';
  };
  welfare: {
    clinicVisitsThisWeek: number;
    clinicStatusText: string;
    booksDueCount: number;
    libraryStatusText: string;
    conductStatus: string;
    statusColor: 'RED' | 'AMBER' | 'GREEN';
  };
  actionItems: Array<{
    id: string;
    type: 'APPROVAL' | 'PAYMENT_PLAN' | 'FEE_PAYMENT' | 'UNIFORM' | 'LIBRARY';
    icon: string;
    label: string;
    description?: string;
    dueDate?: string;
    isOverdue?: boolean;
    actionUrl: string;
    actionModal?: 'TRIP_APPROVAL' | 'PAY_NOW' | null;
    payload?: any;
  }>;
  totalActionItemsCount: number;
  timeline: Array<{
    day: string;
    date: string;
    event: string;
    type: 'EVENT' | 'EXAM' | 'FEE_DEADLINE' | 'SPORTS';
  }>;
  messages: Array<{
    id: string;
    senderName: string;
    senderRole: string;
    preview: string;
    timestamp: string;
    type: 'MESSAGE' | 'NOTICE';
    actionType: 'REPLY' | 'VIEW';
    actionUrl: string;
  }>;
  thresholds: {
    feeDueSoonDays: number;
    attendanceWarningPercent: number;
  };
  generatedAt: string;
}

interface CachedDashboard {
  data: DashboardSummary;
  savedAt: number;
}

export default function ParentDashboard() {
  const { user, activeEntity, setActiveEntity } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Child selection state
  const linkedChildren = useMemo(() => {
    return user?.linkedEntities?.filter(e => e.status === 'APPROVED') || [];
  }, [user?.linkedEntities]);

  const [activeChildId, setActiveChildId] = useState<string>(() => {
    const saved = localStorage.getItem('acadex_active_child_id');
    if (saved && linkedChildren.some(c => c.id === saved)) {
      return saved;
    }
    return activeEntity?.id || (linkedChildren[0]?.id ?? '');
  });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  // Modals
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'paynow' | 'zipit'>('paynow');
  const [payLoading, setPayLoading] = useState(false);

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [tripApproved, setTripApproved] = useState(false);

  // Load from cache first for zero-latency instant render
  const loadFromCache = useCallback((childId: string): boolean => {
    try {
      const cachedStr = localStorage.getItem(`acadex_parent_dash_${childId}`);
      if (cachedStr) {
        const cached: CachedDashboard = JSON.parse(cachedStr);
        setSummary(cached.data);
        const minutesAgo = Math.floor((Date.now() - cached.savedAt) / 60000);
        setLastUpdatedText(
          minutesAgo <= 0 ? 'Updated just now' : `Updated ${minutesAgo}m ago`
        );
        return true;
      }
    } catch (e) {
      console.error('Error reading dashboard cache:', e);
    }
    return false;
  }, []);

  // Fetch summary data from backend
  const fetchDashboardData = useCallback(async (childId: string, background: boolean = false) => {
    if (!childId) return;

    if (!background) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await api.get(`/api/dashboard/parent?studentId=${childId}`);
      if (res.data?.summary) {
        const freshData: DashboardSummary = res.data.summary;
        setSummary(freshData);

        // Save snapshot to local cache
        const now = Date.now();
        localStorage.setItem(`acadex_parent_dash_${childId}`, JSON.stringify({
          data: freshData,
          savedAt: now
        }));
        setLastUpdatedText('Updated just now');
      }
    } catch (err: any) {
      console.error('Failed to fetch parent dashboard summary:', err);
      if (!summary) {
        showToast('Unable to load live student data. Check your internet connection.', 'error');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [summary, showToast]);

  // Initial load or child change
  useEffect(() => {
    if (!activeChildId) return;

    // Persist active child id
    localStorage.setItem('acadex_active_child_id', activeChildId);

    // Sync active entity if different
    const matchedEntity = linkedChildren.find(c => c.id === activeChildId);
    if (matchedEntity && activeEntity?.id !== matchedEntity.id) {
      setActiveEntity(matchedEntity);
    }

    // Immediate cached hydration
    const hasCache = loadFromCache(activeChildId);

    // Trigger fresh fetch (background if cache exists)
    fetchDashboardData(activeChildId, hasCache);
  }, [activeChildId]);

  // Handle Child Switcher
  const handleChildSwitch = (newChildId: string) => {
    if (newChildId === activeChildId) return;
    setActiveChildId(newChildId);
    const matched = linkedChildren.find(c => c.id === newChildId);
    if (matched) {
      setActiveEntity(matched);
    }
  };

  // Quick Pay Modal Trigger
  const handleOpenPay = (payload?: any) => {
    const bal = payload?.amount ?? summary?.fees.balanceDue ?? 0;
    setPayAmount(bal > 0 ? bal.toFixed(2) : '100.00');
    setPayModalOpen(true);
  };

  const handleProcessPayment = () => {
    setPayLoading(true);
    setTimeout(() => {
      setPayLoading(false);
      setPayModalOpen(false);
      showToast(
        payMethod === 'paynow'
          ? 'Connecting to Paynow Secure Gateway...'
          : 'Zipit Reference submitted for Bursar reconciliation.',
        'success'
      );
    }, 1200);
  };

  // Quick Trip Approval Modal Trigger
  const handleOpenTripModal = (payload?: any) => {
    setTripData(payload || {
      tripTitle: 'National Museum Educational Trip',
      date: '28 March 2026',
      destination: 'National History Museum & Gardens',
      transport: 'School Bus #4',
      costCovered: 'Included in term activity fee'
    });
    setTripApproved(false);
    setTripModalOpen(true);
  };

  const handleAuthorizeTrip = () => {
    setTripApproved(true);
    setTimeout(() => {
      setTripModalOpen(false);
      showToast('Excursion consent signed and submitted to administration.', 'success');
      // Remove trip action item optimistically
      if (summary) {
        setSummary({
          ...summary,
          actionItems: summary.actionItems.filter(item => item.type !== 'APPROVAL'),
          totalActionItemsCount: Math.max(0, summary.totalActionItemsCount - 1)
        });
      }
    }, 800);
  };

  // Active child metadata
  const currentChildName = summary?.child.name || activeEntity?.name || 'Student';
  const currentClassName = summary?.child.className || 'Form 3';
  const currentHouseName = summary?.child.houseName || 'Takawira House';
  const currentAvatar = summary?.child.avatar;

  // Traffic light color helpers
  const getTrafficColor = (status: 'RED' | 'AMBER' | 'GREEN') => {
    switch (status) {
      case 'RED': return '#ef4444';
      case 'AMBER': return '#f59e0b';
      case 'GREEN': return '#10b981';
      default: return '#10b981';
    }
  };

  const getTrafficBg = (status: 'RED' | 'AMBER' | 'GREEN') => {
    switch (status) {
      case 'RED': return 'rgba(239, 68, 68, 0.06)';
      case 'AMBER': return 'rgba(245, 158, 11, 0.06)';
      case 'GREEN': return 'rgba(16, 185, 129, 0.06)';
      default: return '#ffffff';
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── CHILD SWITCHER (Sticky Top Glance Header) ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 16px',
        margin: '-20px -20px 20px -20px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar / Photo */}
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--school-primary, #3b82f6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            border: '2px solid #ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {currentAvatar ? (
              <img
                src={`${BASE_URL}/api/storage/media/${summary?.child.schoolCode || 'global'}/${currentAvatar}`}
                alt={currentChildName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              currentChildName.split(' ').map(n => n[0]).slice(0, 2).join('')
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {currentChildName}
              </h2>
              {isRefreshing && (
                <i className="fas fa-sync fa-spin" style={{ fontSize: '0.75rem', color: '#94a3b8' }} title="Syncing live data..."></i>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{currentClassName}</span>
              <span>•</span>
              <span>{currentHouseName}</span>
            </div>
          </div>
        </div>

        {/* Switcher & Refresh indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {linkedChildren.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select
                value={activeChildId}
                onChange={(e) => handleChildSwitch(e.target.value)}
                style={{
                  padding: '7px 28px 7px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              >
                {linkedChildren.map(c => (
                  <option key={c.id} value={c.id}>
                    Switch Child: {c.name}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down" style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                color: '#64748b',
                pointerEvents: 'none'
              }}></i>
            </div>
          )}

          {lastUpdatedText && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="fas fa-bolt" style={{ color: '#f59e0b' }}></i> {lastUpdatedText}
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION 1: 4 STATUS CARDS (Traffic-Light Color Coded Grid) ── */}
      {/* 2x2 on Mobile, 4-across on Desktop. NEVER more than 3 lines of text per card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
        marginBottom: 24
      }}>
        {/* 1. Fees Card */}
        {loading && !summary ? (
          <div className="portal-stat-card" style={{ padding: 16, height: 110, animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: 14, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 10 }}></div>
            <div style={{ height: 20, width: '80%', background: '#cbd5e1', borderRadius: 4, marginBottom: 8 }}></div>
            <div style={{ height: 14, width: '40%', background: '#e2e8f0', borderRadius: 4 }}></div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/parent/fees')}
            style={{
              background: getTrafficBg(summary?.fees.statusColor || 'GREEN'),
              borderLeft: `4px solid ${getTrafficColor(summary?.fees.statusColor || 'GREEN')}`,
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              borderLeftWidth: 4,
              borderLeftColor: getTrafficColor(summary?.fees.statusColor || 'GREEN'),
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 110,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <div>
              {/* Line 1: Balance Due */}
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Balance Due: {summary?.fees.currencySymbol}{(summary?.fees.balanceDue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {summary?.fees.currency}
              </div>
              {/* Line 2: Due Date / Overdue Status */}
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: 4, color: getTrafficColor(summary?.fees.statusColor || 'GREEN') }}>
                {summary?.fees.overdueText || 'Current / Settled'}
              </div>
            </div>

            {/* Line 3: Pay Now Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              {summary && summary.fees.balanceDue > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPay(summary.fees);
                  }}
                  style={{
                    background: getTrafficColor(summary.fees.statusColor),
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>Pay Now</span>
                  <i className="fas fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
                </button>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>Settled
                </span>
              )}
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tap for fees <i className="fas fa-chevron-right"></i></span>
            </div>
          </div>
        )}

        {/* 2. Academics Card */}
        {loading && !summary ? (
          <div className="portal-stat-card" style={{ padding: 16, height: 110, animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: 14, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 10 }}></div>
            <div style={{ height: 20, width: '80%', background: '#cbd5e1', borderRadius: 4, marginBottom: 8 }}></div>
            <div style={{ height: 14, width: '40%', background: '#e2e8f0', borderRadius: 4 }}></div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/parent/academics?tab=overview')}
            style={{
              background: '#ffffff',
              borderLeft: '4px solid #3b82f6',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              borderLeftWidth: 4,
              borderLeftColor: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 110,
              transition: 'transform 0.15s ease'
            }}
          >
            <div>
              {/* Line 1: Term Average + Single Trend Arrow */}
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {summary?.academics.termName} Average: {summary?.academics.currentAverage}%{' '}
                <span style={{
                  color: summary?.academics.trendArrow === 'up' ? '#10b981' : summary?.academics.trendArrow === 'down' ? '#ef4444' : '#64748b',
                  fontWeight: 900
                }}>
                  {summary?.academics.trendArrow === 'up' ? '↑' : summary?.academics.trendArrow === 'down' ? '↓' : '→'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                  {' '}from {summary?.academics.previousAverage}%
                </span>
              </div>
              {/* Line 2: Latest Assessment Score */}
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4, fontWeight: 600 }}>
                Latest: {summary?.academics.latestAssessment} ({summary?.academics.latestScore}%)
              </div>
            </div>

            {/* Line 3: Direct Link */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--school-primary, #3b82f6)', fontWeight: 700 }}>
                View Report <i className="fas fa-external-link-alt" style={{ fontSize: '0.65rem', marginLeft: 4 }}></i>
              </span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tap for grades <i className="fas fa-chevron-right"></i></span>
            </div>
          </div>
        )}

        {/* 3. Attendance Card */}
        {loading && !summary ? (
          <div className="portal-stat-card" style={{ padding: 16, height: 110, animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: 14, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 10 }}></div>
            <div style={{ height: 20, width: '80%', background: '#cbd5e1', borderRadius: 4, marginBottom: 8 }}></div>
            <div style={{ height: 14, width: '40%', background: '#e2e8f0', borderRadius: 4 }}></div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/parent/attendance')}
            style={{
              background: getTrafficBg(summary?.attendance.statusColor || 'GREEN'),
              borderLeft: `4px solid ${getTrafficColor(summary?.attendance.statusColor || 'GREEN')}`,
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              borderLeftWidth: 4,
              borderLeftColor: getTrafficColor(summary?.attendance.statusColor || 'GREEN'),
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 110,
              transition: 'transform 0.15s ease'
            }}
          >
            <div>
              {/* Line 1: Term Attendance % */}
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {summary?.attendance.presentPercent}% Present this term
              </div>
              {/* Line 2: Absence & Late counts */}
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, fontWeight: 600 }}>
                Absent: {summary?.attendance.absentDays} days | Late: {summary?.attendance.lateDays}
              </div>
            </div>

            {/* Line 3: Today's Gate/Class Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: getTrafficColor(summary?.attendance.statusColor || 'GREEN')
              }}>
                <i className="fas fa-check-circle" style={{ marginRight: 4, fontSize: '0.7rem' }}></i>
                Today: {summary?.attendance.todayStatus}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tap for logs <i className="fas fa-chevron-right"></i></span>
            </div>
          </div>
        )}

        {/* 4. Welfare Card (Clinic + Library + Conduct) - STRICTLY NO EMERGENCY DATA */}
        {loading && !summary ? (
          <div className="portal-stat-card" style={{ padding: 16, height: 110, animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: 14, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 10 }}></div>
            <div style={{ height: 20, width: '80%', background: '#cbd5e1', borderRadius: 4, marginBottom: 8 }}></div>
            <div style={{ height: 14, width: '40%', background: '#e2e8f0', borderRadius: 4 }}></div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/parent/clinic?tab=wellbeing')}
            style={{
              background: '#ffffff',
              borderLeft: '4px solid #10b981',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              borderLeftWidth: 4,
              borderLeftColor: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 110,
              transition: 'transform 0.15s ease'
            }}
          >
            <div>
              {/* Line 1: Clinic visits this week (non-alarming, factual) */}
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                {summary?.welfare.clinicStatusText}
              </div>
              {/* Line 2: Library books status */}
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 3 }}>
                Library: {summary?.welfare.libraryStatusText}
              </div>
            </div>

            {/* Line 3: Conduct Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                <i className="fas fa-award" style={{ marginRight: 4 }}></i>
                {summary?.welfare.conductStatus}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tap for wellbeing <i className="fas fa-chevron-right"></i></span>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 2: "NEEDS YOUR ATTENTION" (Priority Above-the-fold) ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem'
            }}>
              <i className="fas fa-bell"></i>
            </span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Needs Your Attention
            </h3>
          </div>

          {summary && summary.totalActionItemsCount > 5 && (
            <Link
              to="/parent/approvals"
              style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--school-primary, #3b82f6)', textDecoration: 'none' }}
            >
              +{summary.totalActionItemsCount - 5} more actions <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }}></i>
            </Link>
          )}
        </div>

        {/* Action Items List */}
        {!summary || summary.actionItems.length === 0 ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#065f46',
            fontSize: '0.9rem',
            fontWeight: 700
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '1.1rem', color: '#10b981' }}></i>
            <span>All clear! No actions needed ✓</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {summary.actionItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: item.isOverdue ? '#fff5f5' : '#f8fafc',
                  border: `1px solid ${item.isOverdue ? '#fecaca' : '#e2e8f0'}`,
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: item.isOverdue ? '#fee2e2' : '#eff6ff',
                    color: item.isOverdue ? '#ef4444' : 'var(--school-primary, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    <i className={item.icon}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      {item.label}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {item.dueDate && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: item.isOverdue ? '#ef4444' : '#64748b'
                    }}>
                      {item.dueDate}
                    </span>
                  )}

                  {/* Inline Action Trigger */}
                  {item.actionModal === 'TRIP_APPROVAL' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenTripModal(item.payload)}
                      style={{
                        background: 'var(--school-primary, #3b82f6)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-signature" style={{ marginRight: 4 }}></i> Sign Consent
                    </button>
                  ) : item.actionModal === 'PAY_NOW' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPay(item.payload)}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Pay Now
                    </button>
                  ) : (
                    <Link
                      to={item.actionUrl}
                      style={{
                        background: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      Review
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3 & 4 (Lazy/Secondary Below-The-Fold Grid) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20
      }}>
        {/* SECTION 3: This Week Timeline (Simple Vertical List, NOT a calendar grid) */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-calendar-day" style={{ color: 'var(--school-primary, #3b82f6)' }}></i>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                This Week Timeline
              </h3>
            </div>
            <Link
              to="/parent/calendar"
              style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--school-primary, #3b82f6)', textDecoration: 'none' }}
            >
              Full Calendar <i className="fas fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(!summary || summary.timeline.length === 0) ? (
              <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '12px 0' }}>
                No scheduled calendar events for this week.
              </div>
            ) : (
              summary.timeline.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    borderLeft: '3px solid var(--school-primary, #3b82f6)',
                    gap: 12
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', minWidth: 85 }}>
                    {item.day} {item.date}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#475569', flex: 1 }}>
                    {item.event}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 4: Recent Messages (Top 2 merged and sorted) */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-comments" style={{ color: '#8b5cf6' }}></i>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Recent Messages & Notices
              </h3>
            </div>
            <Link
              to="/parent/messages"
              style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--school-primary, #3b82f6)', textDecoration: 'none' }}
            >
              View All <i className="fas fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!summary || summary.messages.length === 0) ? (
              <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '12px 0' }}>
                No recent messages or circulars.
              </div>
            ) : (
              summary.messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                      {m.senderName} <span style={{ fontWeight: 400, color: '#64748b' }}>({m.senderRole})</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{m.timestamp}</span>
                  </div>

                  <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                    {m.preview}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link
                      to={m.actionUrl}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--school-primary, #3b82f6)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {m.actionType === 'REPLY' ? (
                        <><span>Reply in Inbox</span> <i className="fas fa-reply" style={{ fontSize: '0.65rem' }}></i></>
                      ) : (
                        <><span>Read Circular</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.65rem' }}></i></>
                      )}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL 1: QUICK PAY (Paynow / Zipit) ── */}
      {payModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 440,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-credit-card"></i>
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Quick Fee Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Paying for <strong>{currentChildName}</strong> ({currentClassName})
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Payment Amount ({summary?.fees.currency || 'USD'})
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Select Gateway
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPayMethod('paynow')}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: payMethod === 'paynow' ? '2px solid var(--school-primary, #3b82f6)' : '1px solid #e2e8f0',
                    background: payMethod === 'paynow' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                >
                  <i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: 6 }}></i> Paynow
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('zipit')}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: payMethod === 'zipit' ? '2px solid var(--school-primary, #3b82f6)' : '1px solid #e2e8f0',
                    background: payMethod === 'zipit' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                >
                  <i className="fas fa-university" style={{ color: '#10b981', marginRight: 6 }}></i> Zipit / Transfer
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={payLoading}
                style={{
                  flex: 2,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--school-primary, #3b82f6)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: payLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {payLoading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                ) : (
                  <><span>Pay {summary?.fees.currencySymbol}{payAmount}</span> <i className="fas fa-lock"></i></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: QUICK TRIP APPROVAL (10-Second Inline Action) ── */}
      {tripModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 460,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-file-signature"></i>
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Excursion Consent</h3>
              </div>
              <button
                type="button"
                onClick={() => setTripModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {tripData?.tripTitle}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><i className="fas fa-calendar-alt mr-1"></i> Date: <strong>{tripData?.date}</strong></div>
                <div><i className="fas fa-bus mr-1"></i> Transport: {tripData?.transport}</div>
                <div><i className="fas fa-tag mr-1"></i> Cost: {tripData?.costCovered}</div>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: '0.78rem',
              color: '#166534',
              marginBottom: 20,
              lineHeight: 1.4
            }}>
              <i className="fas fa-shield-alt" style={{ marginRight: 6 }}></i>
              I, as the registered guardian of <strong>{currentChildName}</strong>, hereby grant permission for participation in this school field trip and authorize on-site medical attention in case of necessity.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setTripModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Review Full Form
              </button>
              <button
                type="button"
                onClick={handleAuthorizeTrip}
                disabled={tripApproved}
                style={{
                  flex: 2,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: tripApproved ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {tripApproved ? (
                  <><i className="fas fa-check"></i> Authorized!</>
                ) : (
                  <><i className="fas fa-signature"></i> I Consent & Authorize</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
