import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import ClockInModal from '../../../components/attendance/ClockInModal';
import '../../../styles/portal.css';

interface LoanItem {
  id: string;
  bookId?: string;
  bookTitle: string;
  bookAuthor?: string;
  accessionNumber?: string;
  borrowerName: string;
  borrowerIdentifier?: string;
  borrowerClass?: string;
  borrowerPhone?: string;
  borrowerEmail?: string;
  borrowedAt: string;
  dueDate: string;
  daysOverdue?: number;
  fineAmount?: number;
  status: string;
  isToday?: boolean;
}

interface LibraryDashboardData {
  today: {
    issued: number;
    returned: number;
  };
  rightNow: {
    currentlyBorrowed: number;
    overdueRightNow: number;
  };
  alerts: {
    dueToday: number;
    reservationsWaitingPickup: number;
  };
  recentIssues: LoanItem[];
  hasIssuesToday: boolean;
  overdueToday: LoanItem[];
  totalBooks?: number;
}

export default function LibraryDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<LibraryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'overdue'>('issues');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Quick Action Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [clockModalAction, setClockModalAction] = useState<'IN' | 'OUT' | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

  // Issue Modal Form State
  const [issueBookSearch, setIssueBookSearch] = useState('');
  const [issueBorrowerQuery, setIssueBorrowerQuery] = useState('');
  const [issueBorrowerType, setIssueBorrowerType] = useState<'student' | 'staff'>('student');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [booksList, setBooksList] = useState<any[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [isSearchingBorrower, setIsSearchingBorrower] = useState(false);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Return Modal Form State
  const [returnSearch, setReturnSearch] = useState('');
  const [activeLoansToReturn, setActiveLoansToReturn] = useState<any[]>([]);
  const [isSearchingReturn, setIsSearchingReturn] = useState(false);
  const [returnSubmittingId, setReturnSubmittingId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/dashboard/library'),
      api.get('/api/staff-attendance/today').catch(() => ({ data: null }))
    ])
      .then(([dashRes, attRes]) => {
        const d = dashRes.data;
        setData({
          today: d.today || { issued: 0, returned: 0 },
          rightNow: d.rightNow || {
            currentlyBorrowed: d.activeLoans || 0,
            overdueRightNow: d.overdueLoans || 0
          },
          alerts: d.alerts || { dueToday: 0, reservationsWaitingPickup: 0 },
          recentIssues: d.recentIssues || d.recentLoans || [],
          hasIssuesToday: d.hasIssuesToday ?? true,
          overdueToday: d.overdueToday || [],
          totalBooks: d.totalBooks || 0
        });
        setAttendanceStatus(attRes.data);
      })
      .catch((err) => {
        console.error('Failed to load library dashboard data', err);
        showToast('Failed to load live dashboard data. Using offline view.', 'error');
        setData({
          today: { issued: 0, returned: 0 },
          rightNow: { currentlyBorrowed: 0, overdueRightNow: 0 },
          alerts: { dueToday: 0, reservationsWaitingPickup: 0 },
          recentIssues: [],
          hasIssuesToday: false,
          overdueToday: []
        });
      })
      .finally(() => setLoading(false));
  };

  // Live Book Search for Quick Issue Modal
  useEffect(() => {
    if (!showIssueModal || issueBookSearch.trim().length < 2) {
      setBooksList([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBooks(true);
      try {
        const res = await api.get(`/api/library/books?search=${encodeURIComponent(issueBookSearch)}`);
        setBooksList(Array.isArray(res.data) ? res.data.slice(0, 8) : []);
      } catch (e) {
        console.error('Failed to search books', e);
      } finally {
        setIsSearchingBooks(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [issueBookSearch, showIssueModal]);

  // Live Borrower Search for Quick Issue Modal
  useEffect(() => {
    if (!showIssueModal || issueBorrowerQuery.trim().length < 2) {
      setSelectedBorrower(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBorrower(true);
      try {
        const res = await api.get(`/api/library/borrowers/validate?type=${issueBorrowerType}&identifier=${encodeURIComponent(issueBorrowerQuery)}`);
        if (res.data && res.data.borrower) {
          setSelectedBorrower(res.data.borrower);
        } else {
          setSelectedBorrower(null);
        }
      } catch (e) {
        setSelectedBorrower(null);
      } finally {
        setIsSearchingBorrower(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [issueBorrowerQuery, issueBorrowerType, showIssueModal]);

  // Search active loans for Quick Return Modal
  useEffect(() => {
    if (!showReturnModal) return;
    const fetchActiveLoans = async () => {
      setIsSearchingReturn(true);
      try {
        const res = await api.get(`/api/library/loans?status=borrowed&search=${encodeURIComponent(returnSearch)}`);
        setActiveLoansToReturn(Array.isArray(res.data) ? res.data.slice(0, 15) : []);
      } catch (e) {
        console.error('Failed to fetch loans to return', e);
      } finally {
        setIsSearchingReturn(false);
      }
    };
    const timer = setTimeout(fetchActiveLoans, 300);
    return () => clearTimeout(timer);
  }, [returnSearch, showReturnModal]);

  const handleQuickIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) {
      showToast('Please select a book to issue', 'error');
      return;
    }
    if (!issueBorrowerQuery) {
      showToast('Please specify a borrower student ID or staff email', 'error');
      return;
    }

    setIssueSubmitting(true);
    try {
      await api.post('/api/library/loans/issue', {
        bookId: selectedBook.id,
        borrowerType: issueBorrowerType,
        identifier: issueBorrowerQuery
      });
      showToast(`Book "${selectedBook.title}" successfully issued!`, 'success');
      setShowIssueModal(false);
      setSelectedBook(null);
      setSelectedBorrower(null);
      setIssueBookSearch('');
      setIssueBorrowerQuery('');
      fetchDashboardData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to issue book';
      showToast(msg, 'error');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handleExecuteReturn = async (loanId: string, bookTitle: string) => {
    setReturnSubmittingId(loanId);
    try {
      await api.post(`/api/library/loans/${loanId}/return`);
      showToast(`Book "${bookTitle}" returned successfully!`, 'success');
      setActiveLoansToReturn(prev => prev.filter(l => l.id !== loanId));
      fetchDashboardData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to return book';
      showToast(msg, 'error');
    } finally {
      setReturnSubmittingId(null);
    }
  };

  const getOverdueBadge = (days: number) => {
    if (days >= 15) {
      return (
        <span style={{
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #f87171',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontWeight: 800,
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <i className="fas fa-exclamation-circle"></i> {days}d Overdue (15+ days)
        </span>
      );
    }
    if (days >= 8) {
      return (
        <span style={{
          background: '#ffedd5',
          color: '#c2410c',
          border: '1px solid #fb923c',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontWeight: 800,
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <i className="fas fa-clock"></i> {days}d Overdue (8–14 days)
        </span>
      );
    }
    return (
      <span style={{
        background: '#fef9c3',
        color: '#854d0e',
        border: '1px solid #facc15',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontWeight: 800,
        fontSize: '0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <i className="fas fa-hourglass-half"></i> {days}d Overdue (1–7 days)
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', flexDirection: 'column', gap: 16 }}>
        <div className="portal-spinner" style={{ width: 44, height: 44 }}></div>
        <p style={{ color: 'var(--school-primary, #3182ce)', fontWeight: 700, fontSize: '1rem' }}>Loading live library operations...</p>
      </div>
    );
  }

  const todayCount = data?.today || { issued: 0, returned: 0 };
  const rightNowCount = data?.rightNow || { currentlyBorrowed: 0, overdueRightNow: 0 };
  const alertsCount = data?.alerts || { dueToday: 0, reservationsWaitingPickup: 0 };
  const recentIssues = data?.recentIssues || [];
  const overdueToday = data?.overdueToday || [];

  return (
    <div className="portal-container animate-in fade-in duration-300" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontWeight: 700,
          fontSize: '0.9rem'
        }}>
          <i className={toastMessage.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'}></i>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Operational Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
              Library Daily Operations
            </h1>
            <span style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              ● LIVE TODAY
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Fast operational circulation desk — focused strictly on today's transactions and urgent actions.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowIssueModal(true)}
            className="portal-btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}
          >
            <i className="fas fa-plus-circle"></i> Issue Book
          </button>

          <button
            onClick={() => setShowReturnModal(true)}
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(5,150,105,0.25)'
            }}
          >
            <i className="fas fa-undo-alt"></i> Return Book
          </button>

          <button
            onClick={fetchDashboardData}
            className="portal-btn-secondary"
            title="Refresh Live Data"
            style={{ padding: '10px 14px', fontSize: '0.9rem' }}
          >
            <i className="fas fa-sync-alt"></i>
          </button>

          {attendanceStatus?.record ? (
            <button
              onClick={() => setClockModalAction('OUT')}
              className="portal-btn-secondary"
              style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#dc2626' }}
            >
              <i className="fas fa-sign-out-alt mr-1"></i> Clock Out
            </button>
          ) : (
            <button
              onClick={() => setClockModalAction('IN')}
              className="portal-btn-secondary"
              style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#059669' }}
            >
              <i className="fas fa-sign-in-alt mr-1"></i> Clock In
            </button>
          )}
        </div>
      </div>

      {/* Operational Metric Cards (Today, Right Now, Alerts) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        {/* GROUP 1: TODAY */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: 18,
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <i className="fas fa-calendar-day mr-1 text-primary"></i> Today's Circulation
            </span>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '2px 8px', borderRadius: 12 }}>
              Today Only
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <div style={{ color: '#166534', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                <i className="fas fa-arrow-up mr-1"></i> Issued Today
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#14532d', lineHeight: 1.1 }}>
                {todayCount.issued}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                Books checked out
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '14px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ color: '#1e40af', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                <i className="fas fa-arrow-down mr-1"></i> Returned Today
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1.1 }}>
                {todayCount.returned}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 4, fontWeight: 600 }}>
                Books checked back in
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 2: RIGHT NOW */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: 18,
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <i className="fas fa-clock mr-1 text-indigo-500"></i> Active Status (Right Now)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 700, background: '#e0e7ff', padding: '2px 8px', borderRadius: 12 }}>
              Current State
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f5f3ff', padding: '14px', borderRadius: 10, border: '1px solid #ddd6fe' }}>
              <div style={{ color: '#5b21b6', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                <i className="fas fa-book-reader mr-1"></i> Currently Borrowed
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4c1d95', lineHeight: 1.1 }}>
                {rightNowCount.currentlyBorrowed}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6d28d9', marginTop: 4, fontWeight: 600 }}>
                In active circulation
              </div>
            </div>

            <div style={{ background: '#fff1f2', padding: '14px', borderRadius: 10, border: '1px solid #fecdd3' }}>
              <div style={{ color: '#9f1239', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                <i className="fas fa-exclamation-triangle mr-1"></i> Overdue Right Now
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#881337', lineHeight: 1.1 }}>
                {rightNowCount.overdueRightNow}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#be123c', marginTop: 4, fontWeight: 600 }}>
                Requires urgent follow-up
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 3: ALERTS */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: 18,
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <i className="fas fa-bell mr-1 text-amber-500"></i> Operational Alerts
            </span>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>
              Needs Attention
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#fffbeb', padding: '14px', borderRadius: 10, border: '1px solid #fde68a' }}>
              <div style={{ color: '#92400e', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                <i className="fas fa-calendar-check mr-1"></i> Books Due Today
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#78350f', lineHeight: 1.1 }}>
                {alertsCount.dueToday}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 4, fontWeight: 600 }}>
                Due for return by closing
              </div>
            </div>

            <div style={{ background: '#faf5ff', padding: '14px', borderRadius: 10, border: '1px solid #e9d5ff' }}>
              <div style={{ color: '#6b21a8', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                <i className="fas fa-bookmark mr-1"></i> Waiting for Pickup
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#581c87', lineHeight: 1.1 }}>
                {alertsCount.reservationsWaitingPickup}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7e22ce', marginTop: 4, fontWeight: 600 }}>
                Reservations ready on shelf
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TODAY-RELEVANT TABLES SECTION */}
      <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Selector Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 20px',
          background: '#f8fafc',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('issues')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'issues' ? 'var(--school-primary, #3182ce)' : '#ffffff',
                color: activeTab === 'issues' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'issues' ? '0 2px 4px rgba(0,0,0,0.1)' : 'inset 0 0 0 1px #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-list-ol"></i>
              Recent Issues {data?.hasIssuesToday ? '(Today)' : '(Latest)'} ({recentIssues.length})
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'overdue' ? '#dc2626' : '#ffffff',
                color: activeTab === 'overdue' ? '#ffffff' : '#475569',
                boxShadow: activeTab === 'overdue' ? '0 2px 4px rgba(220,38,38,0.2)' : 'inset 0 0 0 1px #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-exclamation-triangle"></i>
              Overdue Today / Right Now ({overdueToday.length})
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            {activeTab === 'issues'
              ? (data?.hasIssuesToday ? 'Showing books issued today' : 'Showing recent issues (none recorded yet today)')
              : 'Showing all books currently overdue and due today'}
          </div>
        </div>

        {/* Tab 1: Recent Issues (Today) Table */}
        {activeTab === 'issues' && (
          <div className="table-responsive" style={{ margin: 0 }}>
            <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Book Details</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Borrower</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Class / Role</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Issued At</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Due Date</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                      <div style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 8 }}><i className="fas fa-inbox"></i></div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#334155' }}>No book issues recorded today</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Click "Issue Book" above to record a new loan.</div>
                    </td>
                  </tr>
                ) : (
                  recentIssues.map((loan) => (
                    <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{loan.bookTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                          <span>By {loan.bookAuthor || 'Unknown'}</span>
                          <span>•</span>
                          <span>Acc: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{loan.accessionNumber}</code></span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#334155' }}>{loan.borrowerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {loan.borrowerIdentifier || '—'}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {loan.borrowerClass}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569', fontSize: '0.85rem' }}>
                        {new Date(loan.borrowedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({new Date(loan.borrowedAt).toLocaleDateString()})</span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {loan.status === 'borrowed' ? (
                          <button
                            onClick={() => handleExecuteReturn(loan.id, loan.bookTitle)}
                            disabled={returnSubmittingId === loan.id}
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              padding: '5px 12px',
                              borderRadius: 6,
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            {returnSubmittingId === loan.id ? 'Returning...' : 'Quick Return'}
                          </button>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 800 }}>Returned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Overdue Today Table */}
        {activeTab === 'overdue' && (
          <div className="table-responsive" style={{ margin: 0 }}>
            <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Book Details</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Borrower & Contact</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Due Date</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Overdue Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Accrued Fine</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueToday.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                      <div style={{ fontSize: '2.5rem', color: '#86efac', marginBottom: 8 }}><i className="fas fa-check-circle"></i></div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#065f46' }}>No overdue books today!</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>All circulating loans are currently in good standing.</div>
                    </td>
                  </tr>
                ) : (
                  overdueToday.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.bookTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By {item.bookAuthor || 'Unknown'}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#334155' }}>{item.borrowerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: 8 }}>
                          <span>{item.borrowerClass}</span>
                          <span>•</span>
                          <span>{item.borrowerPhone || 'No Phone'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}>
                        {new Date(item.dueDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {getOverdueBadge(item.daysOverdue || 1)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 900, color: '#b91c1c', fontSize: '0.95rem' }}>
                        ${(item.fineAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleExecuteReturn(item.id, item.bookTitle)}
                          disabled={returnSubmittingId === item.id}
                          style={{
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <i className="fas fa-check"></i> {returnSubmittingId === item.id ? 'Processing...' : 'Return Book'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK ISSUE MODAL */}
      {showIssueModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 580,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-book-medical"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Quick Issue Book</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>One-click loan checkout for students or staff</p>
                </div>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickIssueSubmit} style={{ padding: 24 }}>
              {/* Step 1: Select Book */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: '#334155', marginBottom: 6 }}>
                  1. Search Book (Title, ISBN, Barcode) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Type book title or scan barcode..."
                    value={issueBookSearch}
                    onChange={(e) => setIssueBookSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                  {isSearchingBooks && (
                    <span style={{ position: 'absolute', right: 12, top: 12, fontSize: '0.8rem', color: '#94a3b8' }}>
                      <i className="fas fa-spinner fa-spin"></i>
                    </span>
                  )}
                </div>

                {/* Dropdown suggestions */}
                {booksList.length > 0 && !selectedBook && (
                  <div style={{
                    marginTop: 6,
                    maxHeight: 180,
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    background: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    {booksList.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedBook(b);
                          setIssueBookSearch(b.title);
                          setBooksList([]);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{b.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By {b.author}</div>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: b.available > 0 ? '#059669' : '#dc2626',
                          background: b.available > 0 ? '#ecfdf5' : '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {b.available > 0 ? `${b.available} Avail` : 'No Copies'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedBook && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af' }}>
                      <i className="fas fa-check-circle mr-1"></i> {selectedBook.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedBook(null); setIssueBookSearch(''); }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Select Borrower */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#334155' }}>
                    2. Borrower Information <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => { setIssueBorrowerType('student'); setSelectedBorrower(null); }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        borderRadius: 4,
                        border: 'none',
                        background: issueBorrowerType === 'student' ? 'var(--school-primary, #3182ce)' : '#f1f5f9',
                        color: issueBorrowerType === 'student' ? '#ffffff' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIssueBorrowerType('staff'); setSelectedBorrower(null); }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        borderRadius: 4,
                        border: 'none',
                        background: issueBorrowerType === 'staff' ? 'var(--school-primary, #3182ce)' : '#f1f5f9',
                        color: issueBorrowerType === 'staff' ? '#ffffff' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Staff
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={issueBorrowerType === 'student' ? 'Enter Student ID (e.g. STU-001) or Name' : 'Enter Staff Email or Name'}
                    value={issueBorrowerQuery}
                    onChange={(e) => setIssueBorrowerQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                  {isSearchingBorrower && (
                    <span style={{ position: 'absolute', right: 12, top: 12, fontSize: '0.8rem', color: '#94a3b8' }}>
                      <i className="fas fa-spinner fa-spin"></i>
                    </span>
                  )}
                </div>

                {selectedBorrower && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    color: '#166534',
                    fontWeight: 700
                  }}>
                    <i className="fas fa-user-check mr-1"></i> Borrower: {selectedBorrower.name} ({selectedBorrower.studentId || selectedBorrower.email || 'Verified'})
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="portal-btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueSubmitting || !selectedBook}
                  className="portal-btn-primary"
                  style={{ padding: '10px 22px', fontSize: '0.85rem', fontWeight: 800 }}
                >
                  {issueSubmitting ? 'Issuing...' : 'Confirm Loan Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RETURN MODAL */}
      {showReturnModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 620,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-undo-alt"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Quick Return Book</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Search active loan or scan barcode to mark returned</p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Filter by book title, borrower name, or accession number..."
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {isSearchingReturn ? (
                  <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Loading borrowed books...
                  </div>
                ) : activeLoansToReturn.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    No active loans matching your search.
                  </div>
                ) : (
                  activeLoansToReturn.map((loan) => {
                    const isOverdue = new Date() > new Date(loan.dueDate);
                    const borrower = loan.student?.name || loan.user?.name || 'Borrower';
                    return (
                      <div
                        key={loan.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                            {loan.book?.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                            <span>Borrower: <strong style={{ color: '#334155' }}>{borrower}</strong></span>
                            <span>•</span>
                            <span>Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
                            {isOverdue && <span style={{ color: '#dc2626', fontWeight: 800 }}>● OVERDUE</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecuteReturn(loan.id, loan.book?.title)}
                          disabled={returnSubmittingId === loan.id}
                          style={{
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          {returnSubmittingId === loan.id ? 'Returning...' : 'Return'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clock In/Out Modal */}
      {clockModalAction && (
        <ClockInModal
          action={clockModalAction}
          onClose={() => setClockModalAction(null)}
          onSuccess={() => {
            setClockModalAction(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
