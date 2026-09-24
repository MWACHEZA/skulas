import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface ReservationRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerName: string;
  borrowerIdentifier: string;
  borrowerPhone: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Ready for Pickup' | 'Issued' | 'Cancelled' | 'Rejected';
  availableCopy: boolean;
  copiesAvailable: number;
  readyAt?: string;
  issuedAt?: string;
}

export default function LibraryReservations() {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Hold Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [borrowerQuery, setBorrowerQuery] = useState('');
  const [validatedBorrower, setValidatedBorrower] = useState<any>(null);
  const [bookQuery, setBookQuery] = useState('');
  const [validatedBook, setValidatedBook] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/library/reservations');
      setReservations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load reservations queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusAction = async (id: string, action: 'APPROVE' | 'READY' | 'ISSUE' | 'CANCEL' | 'REJECT') => {
    setActionLoading(id);
    try {
      const res = await api.patch(`/api/library/reservations/${id}/status`, { action });
      showToast(res.data?.message || `Reservation updated successfully`, 'success');
      fetchReservations();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleValidateBorrower = async () => {
    if (!borrowerQuery.trim()) return;
    try {
      const res = await api.get(`/api/library/borrowers/validate?query=${encodeURIComponent(borrowerQuery.trim())}`);
      setValidatedBorrower(res.data);
    } catch (err: any) {
      setValidatedBorrower(null);
      showToast(err.response?.data?.error || 'Borrower not found', 'error');
    }
  };

  const handleValidateBook = async () => {
    if (!bookQuery.trim()) return;
    try {
      const res = await api.get(`/api/library/books/validate?query=${encodeURIComponent(bookQuery.trim())}`);
      setValidatedBook(res.data);
    } catch (err: any) {
      setValidatedBook(null);
      showToast(err.response?.data?.error || 'Book not found', 'error');
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedBorrower || !validatedBook) {
      showToast('Please validate both borrower and book', 'error');
      return;
    }

    setCreating(true);
    try {
      await api.post('/api/library/reservations', {
        bookId: validatedBook.id,
        studentId: validatedBorrower.type === 'Student' ? validatedBorrower.id : null,
        userId: validatedBorrower.type === 'Staff' ? validatedBorrower.id : null,
        notes
      });
      showToast('Hold reservation successfully registered', 'success');
      setShowAddModal(false);
      setValidatedBorrower(null);
      setValidatedBook(null);
      setBorrowerQuery('');
      setBookQuery('');
      setNotes('');
      fetchReservations();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to place reservation', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filteredReservations = reservations.filter(r => {
    const matchesFilter = filterStatus === 'all' || r.status.toLowerCase() === filterStatus.toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      r.bookTitle.toLowerCase().includes(q) ||
      r.borrowerName.toLowerCase().includes(q) ||
      r.borrowerIdentifier.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const readyCount = reservations.filter(r => r.status === 'Ready for Pickup').length;
  const pendingCount = reservations.filter(r => r.status === 'Pending').length;
  const holdWaitCount = reservations.filter(r => r.status === 'Approved' && !r.availableCopy).length;

  return (
    <div className="library-portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-bookmark mr-3 text-primary" style={{ color: '#2563eb' }}></i>
            Library Reservations & Hold Queue
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Manage hold requests, monitor available returns, and dispatch pickup alerts.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="portal-btn-primary" 
          style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-plus"></i> Place New Hold
        </button>
      </div>

      {/* Top Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Queue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{reservations.length}</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: '16px 20px', borderRadius: 12, border: '1px solid #86efac', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Ready For Pickup</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>{readyCount}</div>
        </div>
        <div style={{ background: '#fffbeb', padding: '16px 20px', borderRadius: 12, border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{pendingCount}</div>
        </div>
        <div style={{ background: '#eff6ff', padding: '16px 20px', borderRadius: 12, border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Waiting for Return</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>{holdWaitCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', padding: '14px 20px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ position: 'relative', width: 320 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
          <input 
            type="text" 
            placeholder="Search patron or book title..." 
            className="portal-input"
            style={{ width: '100%', paddingLeft: 40, height: 40, borderRadius: 8, fontSize: '0.85rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'Pending', 'Ready for Pickup', 'Approved', 'Issued', 'Cancelled'] as const).map(st => (
            <button 
              key={st}
              onClick={() => setFilterStatus(st)}
              className={filterStatus === st ? 'portal-btn-primary' : 'portal-btn-ghost'}
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8 }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Hold Queue Table */}
      <div className="portal-card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#ffffff' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin mr-2"></i> Loading reservation queue...
          </div>
        ) : filteredReservations.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-clipboard-check" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
            <p style={{ fontWeight: 600, margin: 0 }}>No hold requests found for this filter.</p>
          </div>
        ) : (
          <table className="portal-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th>Patron / Requester</th>
                <th>Reserved Book</th>
                <th>Copy Stock Status</th>
                <th>Request Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map(res => (
                <tr key={res.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{res.borrowerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      ID: {res.borrowerIdentifier} {res.borrowerPhone !== '—' ? `| ${res.borrowerPhone}` : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{res.bookTitle}</div>
                  </td>
                  <td>
                    {res.copiesAvailable > 0 ? (
                      <span className="portal-badge success" style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-check-circle"></i> {res.copiesAvailable} in stock
                      </span>
                    ) : (
                      <span className="portal-badge warning" style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-hourglass-half"></i> 0 in stock (On hold)
                      </span>
                    )}
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                    {new Date(res.requestDate).toLocaleDateString()}
                  </td>
                  <td>
                    <span 
                      className={`portal-badge ${
                        res.status === 'Ready for Pickup' ? 'success' :
                        res.status === 'Approved' ? 'info' :
                        res.status === 'Pending' ? 'warning' :
                        res.status === 'Issued' ? 'neutral' : 'danger'
                      }`}
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      {res.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="no-print">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {res.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusAction(res.id, 'APPROVE')}
                            disabled={actionLoading === res.id}
                            className="portal-btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, background: '#2563eb' }}
                            title="Approve Hold (checks copy stock)"
                          >
                            <i className="fas fa-check mr-1"></i> Approve
                          </button>
                          <button 
                            onClick={() => handleStatusAction(res.id, 'REJECT')}
                            disabled={actionLoading === res.id}
                            className="portal-btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6 }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {res.status === 'Ready for Pickup' && (
                        <button 
                          onClick={() => handleStatusAction(res.id, 'ISSUE')}
                          disabled={actionLoading === res.id}
                          className="portal-btn-primary"
                          style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 6, background: '#059669' }}
                          title="Hand out and issue book loan"
                        >
                          <i className="fas fa-hand-holding mr-1"></i> Issue to Patron
                        </button>
                      )}

                      {res.status === 'Approved' && res.copiesAvailable > 0 && (
                        <button 
                          onClick={() => handleStatusAction(res.id, 'READY')}
                          disabled={actionLoading === res.id}
                          className="portal-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, color: '#059669' }}
                        >
                          Mark Ready
                        </button>
                      )}

                      {(res.status === 'Pending' || res.status === 'Approved' || res.status === 'Ready for Pickup') && (
                        <button 
                          onClick={() => handleStatusAction(res.id, 'CANCEL')}
                          disabled={actionLoading === res.id}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px 6px', fontSize: '0.85rem' }}
                          title="Cancel Reservation"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Place New Hold Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 540 }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                  Place Hold on Resource
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Reserve a volume for a student or faculty member.
                </p>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateReservation} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Borrower search */}
              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>1. Patron (Student or Staff ID / Name) *</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input 
                    type="text" 
                    placeholder="Enter admission ID or staff name..."
                    className="portal-input"
                    value={borrowerQuery}
                    onChange={e => setBorrowerQuery(e.target.value)}
                  />
                  <button type="button" onClick={handleValidateBorrower} className="portal-btn-secondary" style={{ padding: '0 14px' }}>Verify</button>
                </div>
                {validatedBorrower && (
                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                    <i className="fas fa-check-circle mr-1"></i> {validatedBorrower.name} ({validatedBorrower.type}) — {validatedBorrower.departmentOrClass}
                  </div>
                )}
              </div>

              {/* Book search */}
              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>2. Book (Title, Accession, or ISBN) *</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input 
                    type="text" 
                    placeholder="Enter book title or accession #..."
                    className="portal-input"
                    value={bookQuery}
                    onChange={e => setBookQuery(e.target.value)}
                  />
                  <button type="button" onClick={handleValidateBook} className="portal-btn-secondary" style={{ padding: '0 14px' }}>Lookup</button>
                </div>
                {validatedBook && (
                  <div style={{ fontSize: '0.8rem', color: validatedBook.isAvailable ? '#15803d' : '#b45309', marginTop: 4, fontWeight: 600 }}>
                    <i className="fas fa-book mr-1"></i> {validatedBook.title} ({validatedBook.available} of {validatedBook.copies} available)
                  </div>
                )}
              </div>

              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Hold Notes / Purpose</label>
                <textarea 
                  rows={2} 
                  className="portal-input" 
                  placeholder="e.g. Needed for physics term project..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddModal(false)} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={creating || !validatedBorrower || !validatedBook} style={{ background: '#2563eb' }}>
                  {creating ? 'Placing Hold...' : 'Confirm Hold Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
