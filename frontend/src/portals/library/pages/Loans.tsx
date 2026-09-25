import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface LoanRecord {
  id: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
  accessionNumber?: string;
  daysOverdue: number;
  fineSoFar: number;
  lastReminderDate?: string;
  borrower: {
    id: string;
    name: string;
    identifier: string;
    type: 'Student' | 'Staff';
    email: string;
    phone: string;
    avatar?: string;
    departmentOrClass: string;
    activeLoansCount: number;
    maxLoans: number;
    capacityDisplay: string;
  };
  book: {
    id: string;
    title: string;
    author: string;
    authors?: string[];
    isbn?: string;
    isbn10?: string;
    isbn13?: string;
    category: string;
    shelfLocation: string;
    barcode: string;
    accessionNumber: string;
    condition: string;
    coverUrl?: string;
    available: number;
    totalCopies: number;
  };
}

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function LibraryLoans() {
  const { showToast } = useToast();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'borrowed' | 'returned' | 'all'>('borrowed');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Issuing Form States
  const [borrowerQuery, setBorrowerQuery] = useState('');
  const [borrowerType, setBorrowerType] = useState<'ALL' | 'STUDENT' | 'STAFF'>('ALL');
  const [validatedBorrower, setValidatedBorrower] = useState<any>(null);
  const [borrowerSearching, setBorrowerSearching] = useState(false);
  const [borrowerSuggestions, setBorrowerSuggestions] = useState<any[]>([]);

  const [bookQuery, setBookQuery] = useState('');
  const [validatedBook, setValidatedBook] = useState<any>(null);
  const [bookSearching, setBookSearching] = useState(false);
  const [bookSuggestions, setBookSuggestions] = useState<any[]>([]);

  const [customDueDate, setCustomDueDate] = useState('');
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  // Live Borrower search suggestions for Loans Modal
  useEffect(() => {
    if (!showIssueModal || borrowerQuery.trim().length < 2 || validatedBorrower) {
      setBorrowerSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const typeParam = borrowerType === 'ALL' ? '' : `&type=${borrowerType}`;
        const res = await api.get(`/api/library/borrowers/search?query=${encodeURIComponent(borrowerQuery.trim())}${typeParam}`);
        setBorrowerSuggestions(Array.isArray(res.data?.borrowers) ? res.data.borrowers : []);
      } catch {
        setBorrowerSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [borrowerQuery, borrowerType, showIssueModal, validatedBorrower]);

  // Live Book search suggestions for Loans Modal
  useEffect(() => {
    if (!showIssueModal || bookQuery.trim().length < 2 || validatedBook) {
      setBookSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/library/books?search=${encodeURIComponent(bookQuery.trim())}`);
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.books) ? res.data.books : []);
        setBookSuggestions(list.slice(0, 8));
      } catch {
        setBookSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bookQuery, showIssueModal, validatedBook]);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/library/loans?status=${statusFilter}`);
      setLoans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to fetch loan records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (id: string, title: string) => {
    if (!window.confirm(`Mark "${title}" as returned?`)) return;
    setActionInProgress(id);
    try {
      await api.post(`/api/library/loans/${id}/return`);
      showToast('Book returned and inventory updated', 'success');
      fetchLoans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process return', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRenew = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await api.post(`/api/library/loans/${id}/renew`);
      showToast(res.data?.message || 'Loan renewed successfully', 'success');
      fetchLoans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to renew loan', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSendReminder = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await api.post(`/api/library/loans/${id}/send-reminder`);
      showToast(res.data?.message || 'Reminder sent to borrower', 'success');
      fetchLoans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send reminder', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Borrower search in modal
  const handleValidateBorrower = async () => {
    if (!borrowerQuery.trim()) return;
    setBorrowerSearching(true);
    try {
      const typeParam = borrowerType === 'ALL' ? '' : `&type=${borrowerType}`;
      const res = await api.get(`/api/library/borrowers/validate?query=${encodeURIComponent(borrowerQuery.trim())}${typeParam}`);
      const b = res.data?.borrower || (res.data?.id ? res.data : null);
      if (b) {
        setValidatedBorrower(b);
        setBorrowerSuggestions([]);
      } else {
        setValidatedBorrower(null);
        showToast('Borrower not found or invalid', 'error');
      }
    } catch (err: any) {
      setValidatedBorrower(null);
      showToast(err.response?.data?.error || 'Borrower not found or invalid', 'error');
    } finally {
      setBorrowerSearching(false);
    }
  };

  // Book search in modal
  const handleValidateBook = async () => {
    if (!bookQuery.trim()) return;
    setBookSearching(true);
    try {
      const res = await api.get(`/api/library/books/validate?query=${encodeURIComponent(bookQuery.trim())}`);
      const b = res.data?.book || (res.data?.id ? res.data : null);
      if (b) {
        setValidatedBook(b);
        setBookSuggestions([]);
      } else {
        setValidatedBook(null);
        showToast('Book not found in catalog', 'error');
      }
    } catch (err: any) {
      setValidatedBook(null);
      showToast(err.response?.data?.error || 'Book not found in catalog', 'error');
    } finally {
      setBookSearching(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedBorrower) {
      showToast('Please validate and select an eligible borrower', 'error');
      return;
    }
    if (!validatedBook) {
      showToast('Please validate and select an available book', 'error');
      return;
    }
    if (!validatedBook.isAvailable) {
      showToast('Selected book has 0 copies available', 'error');
      return;
    }

    setIssuing(true);
    try {
      const payload: any = {
        bookId: validatedBook.id,
        accessionNumber: validatedBook.accessionNumber,
        dueDate: customDueDate || undefined
      };

      if (validatedBorrower.type === 'Student') {
        payload.studentId = validatedBorrower.id;
      } else {
        payload.userId = validatedBorrower.id;
      }

      const res = await api.post('/api/library/loans/issue', payload);
      showToast(`Book successfully issued to ${res.data?.borrowerName || validatedBorrower.name}! Due on ${res.data?.dueDate}`, 'success');
      setShowIssueModal(false);
      resetIssueModal();
      fetchLoans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to issue book', 'error');
    } finally {
      setIssuing(false);
    }
  };

  const resetIssueModal = () => {
    setBorrowerQuery('');
    setValidatedBorrower(null);
    setBorrowerSuggestions([]);
    setBookQuery('');
    setValidatedBook(null);
    setBookSuggestions([]);
    setCustomDueDate('');
  };

  const filteredLoans = loans.filter(loan => {
    const q = searchTerm.toLowerCase();
    return (
      loan.borrower?.name?.toLowerCase().includes(q) ||
      loan.borrower?.identifier?.toLowerCase().includes(q) ||
      loan.book?.title?.toLowerCase().includes(q) ||
      loan.book?.accessionNumber?.toLowerCase().includes(q) ||
      loan.book?.barcode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="library-portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-handshake mr-3 text-primary" style={{ color: '#2563eb' }}></i>
            Circulation & Active Loans
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Monitor checkouts, borrower borrowing capacity, and resource return statuses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="no-print">
          <button 
            onClick={() => {
              const headers = ['Borrower', 'Type', 'Class/Dept', 'Book Title', 'Accession #', 'Issue Date', 'Due Date', 'Status'];
              const rows = filteredLoans.map(l => [
                l.borrower?.name || 'N/A',
                l.borrower?.type || 'N/A',
                l.borrower?.departmentOrClass || 'N/A',
                l.book?.title || 'N/A',
                l.accessionNumber || l.book?.accessionNumber || 'N/A',
                new Date(l.borrowedAt).toLocaleDateString(),
                new Date(l.dueDate).toLocaleDateString(),
                l.returnedAt ? 'Returned' : (l.daysOverdue > 0 ? 'Overdue' : 'Active')
              ]);
              exportToCSV('Library_Active_Loans', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-csv mr-1"></i> CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="portal-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-print mr-1"></i> Print
          </button>
          <button 
            onClick={() => { resetIssueModal(); setShowIssueModal(true); }}
            className="portal-btn-primary" 
            style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-plus"></i> Issue Book
          </button>
        </div>
      </div>

      {/* Search & Tabs Filter */}
      <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ position: 'relative', width: 340 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
          <input 
            type="text" 
            placeholder="Search borrower, book title, or accession #..."
            className="portal-input"
            style={{ width: '100%', paddingLeft: 42, height: 42, borderRadius: 10, fontSize: '0.85rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => setStatusFilter('borrowed')}
            className={statusFilter === 'borrowed' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: 8 }}
          >
            Active Loans
          </button>
          <button 
            onClick={() => setStatusFilter('returned')}
            className={statusFilter === 'returned' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: 8 }}
          >
            Returned History
          </button>
          <button 
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: 8 }}
          >
            All Records
          </button>
        </div>
      </div>

      {/* 2-Panel Active Loans Display */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading loan circulation records...
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="portal-card" style={{ padding: 60, textAlign: 'center', color: '#64748b', borderRadius: 16 }}>
          <i className="fas fa-inbox" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
          <p style={{ fontWeight: 600, margin: 0 }}>No loan records found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredLoans.map(loan => {
            const isOverdue = !loan.returnedAt && loan.daysOverdue > 0;
            const daysLeft = Math.ceil((new Date(loan.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div 
                key={loan.id} 
                className="portal-card" 
                style={{ 
                  borderRadius: 16, 
                  border: isOverdue ? '1px solid #fca5a5' : '1px solid #e2e8f0', 
                  background: '#ffffff', 
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', minHeight: 140 }}>
                  {/* PANEL 1: Borrower Details */}
                  <div style={{ padding: '20px', background: isOverdue ? '#fff5f5' : '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 800, fontSize: '1rem', overflow: 'hidden' }}>
                          {loan.borrower?.avatar ? (
                            <img src={loan.borrower.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            loan.borrower?.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                            {loan.borrower?.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            <span className={`portal-badge ${loan.borrower?.type === 'Student' ? 'info' : 'warning'}`} style={{ padding: '2px 6px', fontSize: '0.7rem', marginRight: 6 }}>
                              {loan.borrower?.type}
                            </span>
                            ID: {loan.borrower?.identifier}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div><i className="fas fa-graduation-cap mr-2 text-muted"></i>{loan.borrower?.departmentOrClass}</div>
                        {loan.borrower?.phone && <div><i className="fas fa-phone mr-2 text-muted"></i>{loan.borrower?.phone}</div>}
                      </div>
                    </div>

                    {/* Borrower Capacity & Fines summary */}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                        ACTIVE BORROWING: <strong style={{ color: '#1e40af' }}>{loan.borrower?.capacityDisplay}</strong>
                      </span>
                      {loan.fineSoFar > 0 && (
                        <span className="portal-badge danger" style={{ fontSize: '0.7rem' }}>
                          Fine: ${loan.fineSoFar.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PANEL 2: Book & Loan Details */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div>
                        <span className="portal-badge info" style={{ fontSize: '0.7rem', marginBottom: 4 }}>
                          {loan.book?.category}
                        </span>
                        <h3 style={{ margin: '4px 0 2px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          {loan.book?.title}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                          by {loan.book?.authors?.join('; ') || loan.book?.author || 'Unknown'}
                        </p>

                        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.8rem', color: '#64748b' }}>
                          <span><strong>Shelf:</strong> {loan.book?.shelfLocation || 'Main Stack'}</span>
                          <span><strong>Accession:</strong> {loan.accessionNumber || loan.book?.accessionNumber}</span>
                          <span><strong>Condition:</strong> {loan.book?.condition || 'Good'}</span>
                        </div>
                      </div>

                      {/* Status / Countdown Badge */}
                      <div style={{ textAlign: 'right' }}>
                        {loan.returnedAt ? (
                          <span className="portal-badge success" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                            <i className="fas fa-check-circle mr-1"></i> Returned
                          </span>
                        ) : isOverdue ? (
                          <div style={{ textAlign: 'right' }}>
                            <span className="portal-badge danger" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-triangle"></i> Overdue by {loan.daysOverdue} {loan.daysOverdue === 1 ? 'day' : 'days'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, marginTop: 4 }}>
                              Fine accrued: ${loan.fineSoFar.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="portal-badge success" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>
                            <i className="fas fa-clock"></i> Due in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                          </span>
                        )}

                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
                          Issued: {new Date(loan.borrowedAt).toLocaleDateString()} | Due: {new Date(loan.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }} className="no-print">
                      {!loan.returnedAt && (
                        <>
                          <button 
                            type="button"
                            onClick={() => handleSendReminder(loan.id)}
                            disabled={actionInProgress === loan.id}
                            className="portal-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                            title="Send reminder notice to borrower"
                          >
                            <i className="fas fa-bell text-warning"></i>
                            Send Reminder
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleRenew(loan.id)}
                            disabled={actionInProgress === loan.id}
                            className="portal-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <i className="fas fa-redo text-info"></i>
                            Renew Loan
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleReturn(loan.id, loan.book?.title)}
                            disabled={actionInProgress === loan.id}
                            className="portal-btn-primary"
                            style={{ padding: '6px 16px', fontSize: '0.8rem', borderRadius: 8, background: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <i className="fas fa-check"></i>
                            Confirm Return
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Issuing Modal */}
      {showIssueModal && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  <i className="fas fa-hand-holding mr-2" style={{ color: '#2563eb' }}></i>
                  Issue Book to Borrower
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Verify borrower quota and scan book barcode or accession number.
                </p>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowIssueModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleIssueSubmit} style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step 1: Select / Validate Borrower */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', display: 'block', marginBottom: 8 }}>
                  1. Identify Borrower (Student or Staff) *
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select 
                    className="portal-input" 
                    value={borrowerType} 
                    onChange={e => setBorrowerType(e.target.value as any)}
                    style={{ width: 130 }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Student Only</option>
                    <option value="STAFF">Staff Only</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Enter Student ID, Staff ID, or full name..."
                    className="portal-input" 
                    style={{ flex: 1 }}
                    value={borrowerQuery}
                    onChange={e => {
                      setBorrowerQuery(e.target.value);
                      if (validatedBorrower) setValidatedBorrower(null);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleValidateBorrower(); } }}
                  />
                  <button 
                    type="button" 
                    onClick={handleValidateBorrower}
                    disabled={borrowerSearching}
                    className="portal-btn-secondary"
                    style={{ padding: '0 16px' }}
                  >
                    {borrowerSearching ? <i className="fas fa-spinner fa-spin"></i> : 'Verify'}
                  </button>
                </div>

                {/* Borrower Suggestions Dropdown */}
                {borrowerSuggestions.length > 0 && !validatedBorrower && (
                  <div style={{
                    marginTop: -4,
                    marginBottom: 10,
                    maxHeight: 180,
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    background: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    {borrowerSuggestions.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setValidatedBorrower(b);
                          setBorrowerQuery(b.name);
                          setBorrowerSuggestions([]);
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
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                            {b.name} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({b.identifier})</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {b.type} • {b.departmentOrClass}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: b.isBlocked ? '#dc2626' : '#059669',
                          background: b.isBlocked ? '#fee2e2' : '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {b.isBlocked ? 'Blocked' : b.capacityDisplay || 'Eligible'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Validated Borrower Feedback Box */}
                {validatedBorrower && (
                  <div style={{ background: validatedBorrower.isBlocked ? '#fee2e2' : '#f0fdf4', border: `1px solid ${validatedBorrower.isBlocked ? '#fca5a5' : '#86efac'}`, padding: 12, borderRadius: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, color: validatedBorrower.isBlocked ? '#b91c1c' : '#15803d' }}>
                        {validatedBorrower.name} ({validatedBorrower.type}) — {validatedBorrower.departmentOrClass}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`portal-badge ${validatedBorrower.isBlocked ? 'danger' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                          {validatedBorrower.capacityDisplay}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setValidatedBorrower(null); setBorrowerQuery(''); setBorrowerSuggestions([]); }}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {validatedBorrower.isBlocked ? (
                      <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: 4 }}>
                        <i className="fas fa-ban mr-1"></i> <strong>BLOCKED:</strong> {validatedBorrower.blockReason}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 4 }}>
                        <i className="fas fa-check-circle mr-1"></i> Eligible to borrow. Outstanding fines: ${Number(validatedBorrower.outstandingFines || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Select / Validate Book */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', display: 'block', marginBottom: 8 }}>
                  2. Scan or Enter Book (Accession #, Barcode, ISBN, or Title) *
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input 
                    type="text" 
                    placeholder="Scan barcode or enter accession / ISBN / title..."
                    className="portal-input" 
                    style={{ flex: 1 }}
                    value={bookQuery}
                    onChange={e => {
                      setBookQuery(e.target.value);
                      if (validatedBook) setValidatedBook(null);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleValidateBook(); } }}
                  />
                  <button 
                    type="button" 
                    onClick={handleValidateBook}
                    disabled={bookSearching}
                    className="portal-btn-secondary"
                    style={{ padding: '0 16px' }}
                  >
                    {bookSearching ? <i className="fas fa-spinner fa-spin"></i> : 'Lookup'}
                  </button>
                </div>

                {/* Book Suggestions Dropdown */}
                {bookSuggestions.length > 0 && !validatedBook && (
                  <div style={{
                    marginTop: -4,
                    marginBottom: 10,
                    maxHeight: 180,
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    background: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    {bookSuggestions.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setValidatedBook({
                            id: b.id,
                            title: b.title,
                            author: b.author,
                            accessionNumber: b.accessionNumber || 'N/A',
                            shelfLocation: b.shelfLocation || 'Main Stack',
                            condition: b.condition || 'Good',
                            available: b.available,
                            copies: b.copies || b.totalCopies,
                            isAvailable: b.available > 0
                          });
                          setBookQuery(b.title);
                          setBookSuggestions([]);
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

                {/* Validated Book Feedback Box */}
                {validatedBook && (
                  <div style={{ background: validatedBook.isAvailable ? '#f0fdf4' : '#fee2e2', border: `1px solid ${validatedBook.isAvailable ? '#86efac' : '#fca5a5'}`, padding: 12, borderRadius: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, color: validatedBook.isAvailable ? '#15803d' : '#b91c1c' }}>
                        {validatedBook.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`portal-badge ${validatedBook.isAvailable ? 'success' : 'danger'}`} style={{ fontSize: '0.75rem' }}>
                          {validatedBook.available} / {validatedBook.copies} Available
                        </span>
                        <button
                          type="button"
                          onClick={() => { setValidatedBook(null); setBookQuery(''); setBookSuggestions([]); }}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Change
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4, display: 'flex', gap: 16 }}>
                      <span>Location: <strong>{validatedBook.shelfLocation}</strong></span>
                      <span>Accession: <strong>{validatedBook.accessionNumber}</strong></span>
                      <span>Condition: <strong>{validatedBook.condition}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Custom Due Date */}
              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Return Due Date (Leave blank to use default policy period)</label>
                <input 
                  type="date" 
                  className="portal-input" 
                  value={customDueDate} 
                  onChange={e => setCustomDueDate(e.target.value)} 
                />
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowIssueModal(false)} disabled={issuing}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="portal-btn-primary" 
                  disabled={issuing || !validatedBorrower || validatedBorrower?.isBlocked || !validatedBook || !validatedBook?.isAvailable}
                  style={{ background: '#2563eb', padding: '0 24px', height: 44, borderRadius: 10 }}
                >
                  {issuing ? 'Issuing...' : 'Finalize & Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
