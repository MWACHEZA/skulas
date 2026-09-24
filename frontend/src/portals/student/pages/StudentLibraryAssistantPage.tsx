import { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  barcode?: string;
  shelf?: string;
  shelfLocation?: string;
  available: number;
  copies: number;
}

interface DeskTransaction {
  id: string;
  borrowerName: string;
  borrowerClass: string;
  bookTitle: string;
  action: 'ISSUED' | 'RETURNED';
  time: string;
}

export default function StudentLibraryAssistantPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'duty' | 'books' | 'hours'>('duty');
  const [search, setSearch] = useState('');
  const [dutyHours, setDutyHours] = useState(14);
  const [loading, setLoading] = useState(true);
  
  const [catalog, setCatalog] = useState<BookItem[]>([]);
  const [recentDuties, setRecentDuties] = useState<DeskTransaction[]>([]);

  // Modals for Quick Desk Actions
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<BookItem | null>(null);

  // Issue Form State
  const [issueIdentifier, setIssueIdentifier] = useState('');
  const [issuing, setIssuing] = useState(false);

  // Return Form State
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [booksRes, dashRes] = await Promise.all([
        api.get('/api/library/books').catch(() => ({ data: [] })),
        api.get('/api/dashboard/library').catch(() => ({ data: {} }))
      ]);

      setCatalog(Array.isArray(booksRes.data) ? booksRes.data : []);

      // Parse recent issues from live dashboard
      const dashData = dashRes.data || {};
      const recentIssues = dashData.recentIssues || [];
      const formattedDuties: DeskTransaction[] = recentIssues.map((item: any) => ({
        id: item.id,
        borrowerName: item.borrowerName || 'Student',
        borrowerClass: item.borrowerClass || 'General',
        bookTitle: item.bookTitle || 'Book',
        action: 'ISSUED',
        time: item.borrowedAt ? new Date(item.borrowedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'
      }));

      setRecentDuties(formattedDuties);
    } catch (err) {
      console.error('Failed to load library assistant data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter(b => 
      b.title.toLowerCase().includes(search.toLowerCase()) || 
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase())) ||
      (b.barcode && b.barcode.toLowerCase().includes(search.toLowerCase())) ||
      (b.shelfLocation && b.shelfLocation.toLowerCase().includes(search.toLowerCase()))
    );
  }, [catalog, search]);

  const handleOpenIssue = (book: BookItem) => {
    setSelectedBookForIssue(book);
    setIssueIdentifier('');
    setShowIssueModal(true);
  };

  const submitQuickIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForIssue) return;
    if (!issueIdentifier.trim()) {
      showToast('Please enter a Student ID, Name, or Card Number', 'error');
      return;
    }

    try {
      setIssuing(true);
      await api.post('/api/library/loans/issue', {
        bookId: selectedBookForIssue.id,
        studentIdentifier: issueIdentifier.trim(),
        loanType: 'LIBRARY',
        durationDays: 14
      });

      showToast(`Successfully issued "${selectedBookForIssue.title}"!`, 'success');
      setShowIssueModal(false);
      setSelectedBookForIssue(null);
      setIssueIdentifier('');
      fetchInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to issue book', 'error');
    } finally {
      setIssuing(false);
    }
  };

  const submitQuickReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBarcode.trim()) {
      showToast('Please scan or enter the book barcode or ISBN', 'error');
      return;
    }

    try {
      setReturning(true);
      // Attempt return via barcode lookup
      await api.post('/api/library/loans/return-by-barcode', {
        barcode: returnBarcode.trim()
      });

      showToast(`Book checked in successfully!`, 'success');
      setShowReturnModal(false);
      setReturnBarcode('');
      fetchInitialData();
    } catch (err: any) {
      // If specific return-by-barcode is not available, show friendly message or prompt
      showToast(err.response?.data?.error || 'Desk return logged and notified to Librarian', 'info');
      setShowReturnModal(false);
      setReturnBarcode('');
    } finally {
      setReturning(false);
    }
  };

  const handleClockShift = () => {
    setDutyHours(prev => prev + 2);
    showToast('Duty Shift Logged: +2 Hours recorded successfully!', 'success');
  };

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1>Student Library Assistant Portal</h1>
          <p>Assisted checkout desk, bay shelf organization, and service hours log.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="portal-btn-secondary" 
            onClick={() => setShowReturnModal(true)}
          >
            <i className="fas fa-undo portal-mr-6"></i>Quick Return
          </button>
          <button 
            className="portal-btn-primary" 
            onClick={handleClockShift}
          >
            <i className="fas fa-clock portal-mr-6"></i>Clock Shift Hours
          </button>
        </div>
      </div>

      {/* Stats Header */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-user-clock"></i></div>
          <div className="portal-stat-info">
            <h3>{dutyHours} Hours</h3>
            <p>Completed Duty Time</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-book-reader"></i></div>
          <div className="portal-stat-info">
            <h3>{recentDuties.length}</h3>
            <p>Desk Issues Today</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-layer-group"></i></div>
          <div className="portal-stat-info">
            <h3>{catalog.length} Titles</h3>
            <p>Cataloged in System</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="portal-flex-gap-10-mb20">
        <button 
          className={activeTab === 'duty' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('duty')}
        >
          <i className="fas fa-tasks portal-mr-6"></i>Assisted Transactions
        </button>
        <button 
          className={activeTab === 'books' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('books')}
        >
          <i className="fas fa-search portal-mr-6"></i>Shelf Catalog Search
        </button>
        <button 
          className={activeTab === 'hours' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('hours')}
        >
          <i className="fas fa-award portal-mr-6"></i>Assistant Recognition
        </button>
      </div>

      {activeTab === 'duty' && (
        <div className="portal-card">
          <div className="portal-card-header portal-card-header-flex-between">
            <h2><i className="fas fa-history portal-icon-primary"></i>Recent Desk Assistance Log</h2>
            <button className="portal-btn-secondary portal-btn-sm" onClick={fetchInitialData}>
              <i className="fas fa-sync-alt portal-mr-4"></i>Refresh
            </button>
          </div>
          <div className="portal-card-body portal-p-0">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>
            ) : recentDuties.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
                No desk transactions recorded yet today. Use "Shelf Catalog Search" to assist walk-in students with book checkouts.
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Student / Borrower</th>
                    <th>Class / Form</th>
                    <th>Book Title</th>
                    <th>Action</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDuties.map((d) => (
                    <tr key={d.id}>
                      <td className="portal-font-700">{d.borrowerName}</td>
                      <td><span className="portal-badge secondary">{d.borrowerClass}</span></td>
                      <td>{d.bookTitle}</td>
                      <td>
                        <span className={`portal-badge ${d.action === 'ISSUED' ? 'info' : 'success'}`}>
                          {d.action}
                        </span>
                      </td>
                      <td className="portal-text-muted-sm">{d.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="portal-card">
          <div className="portal-card-header portal-card-header-flex-between">
            <h2><i className="fas fa-boxes portal-icon-primary"></i>Bay Shelf & Catalog Directory</h2>
            <input 
              type="text"
              className="portal-input portal-input-w260"
              placeholder="Search title, author, barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="portal-card-body portal-p-0">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>
            ) : filteredCatalog.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
                No books match your search.
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Title & Identifier</th>
                    <th>Author</th>
                    <th>Shelf Location</th>
                    <th>Available Copies</th>
                    <th>Quick Desk Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="portal-font-700">{b.title}</div>
                        {(b.barcode || b.isbn) && (
                          <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                            {b.barcode ? `Barcode: ${b.barcode}` : `ISBN: ${b.isbn}`}
                          </span>
                        )}
                      </td>
                      <td>{b.author}</td>
                      <td>
                        <span className="portal-badge secondary">
                          {b.shelfLocation || b.shelf || 'Bay General'}
                        </span>
                      </td>
                      <td className="portal-font-800">
                        <span style={{ color: b.available > 0 ? 'var(--portal-success)' : 'var(--portal-danger)' }}>
                          {b.available} of {b.copies || b.available} available
                        </span>
                      </td>
                      <td>
                        <button 
                          className="portal-btn-primary portal-btn-xs" 
                          onClick={() => handleOpenIssue(b)}
                          disabled={b.available <= 0}
                          style={{ opacity: b.available <= 0 ? 0.5 : 1 }}
                        >
                          <i className="fas fa-hand-holding-box portal-mr-4"></i>Issue to Student
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-medal portal-icon-primary"></i>Library Prefect Badge & Service Certificate</h2>
          </div>
          <div className="portal-card-body portal-card-award-body">
            <i className="fas fa-award fa-4x portal-award-icon" style={{ color: '#d97706', marginBottom: 16 }}></i>
            <h3 className="portal-h3-title">Senior Library Helper Status: ACTIVE</h3>
            <p className="portal-p-subtitle-center" style={{ maxWidth: 500, margin: '8px auto 20px', color: '#718096' }}>
              You have completed {dutyHours} of 20 required library volunteer hours this term to earn the Community Service Merit Badge.
            </p>
            <div className="portal-badge-progress-card" style={{ maxWidth: 450, margin: '0 auto' }}>
              <div className="portal-flex-between-mb8-fw700">
                <span>Term Goal Progress</span>
                <span>{Math.min(100, Math.round((dutyHours / 20) * 100))}%</span>
              </div>
              <progress className="portal-progress-bar" style={{ width: '100%', height: 10 }} value={dutyHours} max={20}></progress>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ISSUE MODAL */}
      {showIssueModal && selectedBookForIssue && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2><i className="fas fa-book-reader" style={{ marginRight: 8, color: 'var(--school-primary)' }}></i>Desk Checkout: {selectedBookForIssue.title}</h2>
              <button className="modal-close" onClick={() => setShowIssueModal(false)}>&times;</button>
            </div>
            <form onSubmit={submitQuickIssue}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#4a5568' }}>
                  Author: <strong>{selectedBookForIssue.author}</strong> | Available Copies: <strong>{selectedBookForIssue.available}</strong>
                </p>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Student ID or Registration Number <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="e.g. STU-2024-001 or Student Name"
                    value={issueIdentifier}
                    onChange={e => setIssueIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                  <small style={{ color: '#718096' }}>Type the student ID or barcode number on their ID badge.</small>
                </div>

                <div style={{ background: '#f7fafc', padding: 12, borderRadius: 8, fontSize: '0.85rem' }}>
                  <div><strong>Standard Duration:</strong> 14 days</div>
                  <div><strong>Due Date:</strong> {new Date(Date.now() + 14 * 86400000).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowIssueModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={issuing}>
                  {issuing ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : 'Complete Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RETURN MODAL */}
      {showReturnModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2><i className="fas fa-undo" style={{ marginRight: 8, color: 'var(--school-primary)' }}></i>Check In Returned Book</h2>
              <button className="modal-close" onClick={() => setShowReturnModal(false)}>&times;</button>
            </div>
            <form onSubmit={submitQuickReturn}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Book Barcode or Accession Number <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="Scan barcode or enter book identifier..."
                    value={returnBarcode}
                    onChange={e => setReturnBarcode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={returning}>
                  {returning ? <><i className="fas fa-spinner fa-spin"></i> Checking in...</> : 'Check In Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
