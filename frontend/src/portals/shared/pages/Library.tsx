import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

// Import full Library suite components
import LibraryDashboard from '../../library/pages/Dashboard';
import LibraryBooks from '../../library/pages/Books';
import LibraryLoans from '../../library/pages/Loans';
import LibraryOverdue from '../../library/pages/Overdue';
import LibraryRequests from '../../library/pages/Requests';
import LibraryDigitalRepository from '../../library/pages/DigitalRepository';
import LibraryReports from '../../library/pages/Reports';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  available: number;
  copies: number;
  category?: { name: string } | null;
  categoryName?: string;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  shelfLocation?: string;
}

interface BookLoan {
  id: string;
  dueDate: string;
  borrowedAt: string;
  loanType: string;
  status: string;
  fineAmount?: number;
  isOverdue?: boolean;
  notes?: string;
  book: {
    title: string;
    author: string;
    isbn?: string;
    category?: string;
  };
}

interface ReservationItem {
  id: string;
  bookId: string;
  bookTitle: string;
  requestDate: string;
  status: string;
  copiesAvailable: number;
  readyAt?: string;
}

export default function Library() {
  const { user } = useAuth();
  const { t, isMedical } = useTerminology();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || '').toUpperCase();
  const isStaff = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'LIBRARIAN', 'TEACHER', 'ANCILLARY', 'BURSAR'].includes(userRole);

  // Active Tab state
  const defaultTab = isStaff ? (searchParams.get('tab') || 'dashboard') : (searchParams.get('tab') || 'catalog');
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Student & Reader State
  const [books, setBooks] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<BookLoan[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Reservation Modal State (for students & teachers)
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedBookToReserve, setSelectedBookToReserve] = useState<Book | null>(null);
  const [reserveNotes, setReserveNotes] = useState('');
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!isStaff || activeTab === 'catalog') {
      fetchCatalog();
    }
    if (activeTab === 'loans' || !isStaff) {
      fetchMyLoans();
    }
    if (activeTab === 'reservations' || !isStaff) {
      fetchMyReservations();
    }
  }, [activeTab]);

  const fetchCatalog = async () => {
    try {
      setLoadingCatalog(true);
      const res = await api.get('/api/library/books');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.books) ? res.data.books : []);
      setBooks(list);
    } catch (err) {
      console.error('Library catalog fetch error:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchMyLoans = async () => {
    try {
      setLoadingLoans(true);
      const res = await api.get('/api/library/my-books');
      setMyLoans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Library loans fetch error:', err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const fetchMyReservations = async () => {
    try {
      setLoadingReservations(true);
      const res = await api.get('/api/library/reservations?mine=true');
      setMyReservations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Library reservations fetch error:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category?.name || b.categoryName || 'Uncategorized').filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) || 
                           b.author.toLowerCase().includes(search.toLowerCase()) ||
                           (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase()));
      const catName = b.category?.name || b.categoryName || 'Uncategorized';
      const matchesCat = activeCategory === 'All' || catName === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [books, search, activeCategory]);

  const handleOpenReserve = (book: Book) => {
    setSelectedBookToReserve(book);
    setReserveNotes('');
    setShowReserveModal(true);
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookToReserve) return;
    try {
      setReserving(true);
      await api.post('/api/library/reservations', {
        bookId: selectedBookToReserve.id,
        notes: reserveNotes.trim() || undefined
      });
      showToast(`Reservation submitted for "${selectedBookToReserve.title}"! You will be notified when ready.`, 'success');
      setShowReserveModal(false);
      setSelectedBookToReserve(null);
      fetchMyReservations();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit reservation', 'error');
    } finally {
      setReserving(false);
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <>
      {/* Dynamic Top Navigation Tabs Bar */}
      <div className="portal-page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>{isMedical ? 'Medical Resource Center' : 'Library & Circulation'}</h1>
          <p>
            {isStaff 
              ? 'Complete school-wide library operations, book catalog, active circulation, and reports.' 
              : 'Discover catalog materials, manage borrowed books, and track reserve hold requests.'}
          </p>
        </div>

        {/* Action Button for Staff vs Student */}
        {!isStaff && (
          <div style={{ display: 'flex', gap: 10 }}>
            {myReservations.some(r => r.status === 'Ready for Pickup') && (
              <span className="portal-badge success" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                <i className="fas fa-bell portal-mr-6"></i>Book Ready for Pickup!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
        {isStaff && (
          <>
            <button 
              className={activeTab === 'dashboard' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('dashboard')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-tachometer-alt" style={{ marginRight: 6 }}></i>Dashboard
            </button>
            <button 
              className={activeTab === 'books' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('books')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-book" style={{ marginRight: 6 }}></i>Book Catalog
            </button>
            <button 
              className={activeTab === 'loans' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('loans')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-handshake" style={{ marginRight: 6 }}></i>Active Loans
            </button>
            <button 
              className={activeTab === 'overdue' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('overdue')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i>Overdue Tracker
            </button>
            <button 
              className={activeTab === 'reservations' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('reservations')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-bookmark" style={{ marginRight: 6 }}></i>Reservations Queue
            </button>
            <button 
              className={activeTab === 'digital' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('digital')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-cloud-download-alt" style={{ marginRight: 6 }}></i>Digital Repository
            </button>
            <button 
              className={activeTab === 'reports' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('reports')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-chart-pie" style={{ marginRight: 6 }}></i>Library Reports
            </button>
          </>
        )}

        {!isStaff && (
          <>
            <button 
              className={activeTab === 'catalog' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('catalog')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-book" style={{ marginRight: 6 }}></i>Resource Catalog
            </button>
            <button 
              className={activeTab === 'loans' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('loans')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-book-reader" style={{ marginRight: 6 }}></i>My Loans & Fines ({myLoans.length})
            </button>
            <button 
              className={activeTab === 'reservations' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('reservations')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-bookmark" style={{ marginRight: 6 }}></i>My Reservations ({myReservations.length})
            </button>
            <button 
              className={activeTab === 'digital' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => handleTabChange('digital')}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-cloud-download-alt" style={{ marginRight: 6 }}></i>Digital Repository
            </button>
          </>
        )}
      </div>

      {/* STAFF FULL MECHANISM VIEWS */}
      {isStaff && activeTab === 'dashboard' && <LibraryDashboard />}
      {isStaff && activeTab === 'books' && <LibraryBooks />}
      {isStaff && activeTab === 'loans' && <LibraryLoans />}
      {isStaff && activeTab === 'overdue' && <LibraryOverdue />}
      {isStaff && activeTab === 'reservations' && <LibraryRequests />}
      {isStaff && activeTab === 'digital' && <LibraryDigitalRepository />}
      {isStaff && activeTab === 'reports' && <LibraryReports />}

      {/* STUDENT & READER VIEWS */}
      {!isStaff && activeTab === 'catalog' && (
        <>
          {/* Discovery Controls */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}></i>
              <input 
                type="text" 
                placeholder="Search by title, author, or ISBN..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid #e2e8f0',
                  fontFamily: 'inherit', fontSize: '1rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              />
            </div>
          </div>

          {/* Categories Tab Bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  background: activeCategory === c ? 'var(--school-primary, #0056b3)' : '#edf2f7',
                  color: activeCategory === c ? 'white' : '#4a5568',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Catalog Listing */}
          {loadingCatalog ? (
            <div style={{ padding: 60, textAlign: 'center' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>
          ) : filteredBooks.length === 0 ? (
            <div className="portal-card" style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              No books found matching your search.
            </div>
          ) : (
            <div className="portal-grid-3">
              {filteredBooks.map(book => {
                const catName = book.category?.name || book.categoryName || 'General';
                return (
                  <div key={book.id} className="portal-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
                    <div className="portal-card-body" style={{ display: 'flex', gap: 16, flex: 1, padding: 20 }}>
                      <div style={{ width: 90, height: 130, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        {book.coverUrl ? (
                          <img src={`/api/storage/${book.coverUrl}`} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fas fa-book fa-3x" style={{ color: '#a0aec0' }}></i>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span className="portal-badge" style={{ alignSelf: 'flex-start', marginBottom: 8, background: 'rgba(49, 130, 206, 0.1)', color: 'var(--portal-primary)', fontSize: '0.7rem' }}>{catName}</span>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: 700, color: '#1a202c', lineHeight: 1.3 }}>{book.title}</h3>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#718096' }}>by {book.author}</p>
                        
                        {book.shelfLocation && (
                          <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: 8 }}>
                            <i className="fas fa-layer-group portal-mr-4"></i>Location: <strong>{book.shelfLocation}</strong>
                          </div>
                        )}

                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: book.available > 0 ? 'var(--portal-success)' : 'var(--portal-danger)' }}>
                            {book.available > 0 ? `${book.available} Available` : 'All Borrowed'}
                          </span>

                          <div style={{ display: 'flex', gap: 6 }}>
                            {book.pdfUrl && (
                              <a 
                                href={`/api/storage/${book.pdfUrl}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="portal-badge success" 
                                style={{ textDecoration: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <i className="fas fa-file-pdf"></i> PDF
                              </a>
                            )}
                            <button
                              className="portal-btn-primary portal-btn-xs"
                              onClick={() => handleOpenReserve(book)}
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              <i className="fas fa-bookmark portal-mr-4"></i>Reserve
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* STUDENT MY LOANS */}
      {!isStaff && activeTab === 'loans' && (
        <div className="portal-card">
          <div className="portal-card-header portal-card-header-flex-between">
            <h2><i className="fas fa-book-reader" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>My Borrowed Books & Due Dates</h2>
            <button className="portal-btn-secondary portal-btn-sm" onClick={fetchMyLoans}>
              <i className="fas fa-sync-alt portal-mr-4"></i>Refresh
            </button>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {loadingLoans ? (
              <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading borrowed books...</div>
            ) : myLoans.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
                You have no active book loans. Browse the Resource Catalog to borrow books from the library.
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Author</th>
                    <th>Borrow Type</th>
                    <th>Borrowed On</th>
                    <th>Return Due</th>
                    <th>Status & Fine</th>
                  </tr>
                </thead>
                <tbody>
                  {myLoans.map((l) => {
                    const overdue = isOverdue(l.dueDate);
                    return (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{l.book.title}</div>
                          {l.book.isbn && <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>ISBN: {l.book.isbn}</span>}
                        </td>
                        <td style={{ color: '#4a5568' }}>{l.book.author}</td>
                        <td>
                          <span className={`portal-badge ${l.loanType === 'TEXTBOOK' ? 'info' : 'warning'}`}>
                            {l.loanType}
                          </span>
                        </td>
                        <td>{new Date(l.borrowedAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{new Date(l.dueDate).toLocaleDateString()}</div>
                          {overdue && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--portal-danger)', fontWeight: 700 }}>
                              Overdue! Please return to library desk.
                            </span>
                          )}
                        </td>
                        <td>
                          {l.status === 'returned' ? (
                            <span className="portal-badge success">Returned</span>
                          ) : overdue ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span className="portal-badge danger">Overdue</span>
                              {l.fineAmount && l.fineAmount > 0 ? (
                                <span style={{ fontSize: '0.75rem', color: '#c53030', fontWeight: 800 }}>
                                  Fine: ${l.fineAmount.toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="portal-badge warning">Active Loan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* STUDENT MY RESERVATIONS */}
      {!isStaff && activeTab === 'reservations' && (
        <div className="portal-card">
          <div className="portal-card-header portal-card-header-flex-between">
            <h2><i className="fas fa-bookmark" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>My Book Reservations Queue</h2>
            <button className="portal-btn-secondary portal-btn-sm" onClick={fetchMyReservations}>
              <i className="fas fa-sync-alt portal-mr-4"></i>Refresh
            </button>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {loadingReservations ? (
              <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading reservations...</div>
            ) : myReservations.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
                You have no pending book holds. When you find a book you want in the Catalog, click "Reserve" to hold it.
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Requested Date</th>
                    <th>Shelf Availability</th>
                    <th>Status</th>
                    <th>Instruction</th>
                  </tr>
                </thead>
                <tbody>
                  {myReservations.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.bookTitle}</td>
                      <td>{new Date(r.requestDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`portal-badge ${r.copiesAvailable > 0 ? 'success' : 'secondary'}`}>
                          {r.copiesAvailable > 0 ? `${r.copiesAvailable} In Stock` : 'Currently Checked Out'}
                        </span>
                      </td>
                      <td>
                        <span className={`portal-badge ${r.status === 'Ready for Pickup' ? 'success' : r.status === 'Approved' ? 'info' : 'warning'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {r.status === 'Ready for Pickup' ? (
                          <strong style={{ color: 'var(--portal-success)' }}>
                            <i className="fas fa-check-circle portal-mr-4"></i>Ready at circulation desk!
                          </strong>
                        ) : r.status === 'Approved' ? (
                          <span>Awaiting librarian staging</span>
                        ) : (
                          <span style={{ color: '#718096' }}>In queue for next available copy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* STUDENT DIGITAL REPOSITORY */}
      {!isStaff && activeTab === 'digital' && <LibraryDigitalRepository />}

      {/* RESERVE BOOK MODAL */}
      {showReserveModal && selectedBookToReserve && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2><i className="fas fa-bookmark" style={{ marginRight: 8, color: 'var(--school-primary)' }}></i>Place Hold Request</h2>
              <button className="modal-close" onClick={() => setShowReserveModal(false)}>&times;</button>
            </div>
            <form onSubmit={submitReservation}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f7fafc', padding: 14, borderRadius: 8 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{selectedBookToReserve.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>by {selectedBookToReserve.author}</p>
                  <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                    Current Availability: <strong>{selectedBookToReserve.available > 0 ? `${selectedBookToReserve.available} copies` : 'None in stock (you will be queued)'}</strong>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>
                    Notes or Reason (Optional)
                  </label>
                  <textarea 
                    className="portal-input"
                    rows={3}
                    placeholder="e.g. For Form 4 Literature term paper..."
                    value={reserveNotes}
                    onChange={e => setReserveNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowReserveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={reserving}>
                  {reserving ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
