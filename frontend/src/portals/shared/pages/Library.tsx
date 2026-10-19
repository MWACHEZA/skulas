import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';
import SearchInput from '../../../components/shared/SearchInput';
import { SkeletonLoader } from '../../../components/shared';

import { useModuleAccess } from '../../../hooks/useModuleAccess';
import ViewingAsToggle from '../../../components/shared/ViewingAsToggle';

// Import full Library suite components
import LibraryDashboard from '../../library/pages/Dashboard';
import LibraryBooks from '../../library/pages/Books';
import LibraryLoans from '../../library/pages/Loans';
import LibraryOverdue from '../../library/pages/Overdue';
import LibraryRequests from '../../library/pages/Requests';
import LibraryDigitalRepository from '../../library/pages/DigitalRepository';
import LibraryReports from '../../library/pages/Reports';
import StudentLibraryAssistantPage from '../../student/pages/StudentLibraryAssistantPage';

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

  const { level, actingAs } = useModuleAccess('library');
  const isStaff = level === 'full';
  
  // If no access, don't show anything or show limited.
  // Wait, if student, level is 'none', but they have access.
  // Let's preserve student logic by checking user?.role === 'STUDENT'
  const isStudent = user?.role === 'STUDENT';
  const hasLimitedAccess = level === 'request_only' || level === 'scoped' || isStudent;
  const noAccess = level === 'none' && !isStudent;

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

  if (noAccess) {
    return (
      <div className="portal-page-header">
        <h1>No Access</h1>
        <p>You do not have permission to view the Library module.</p>
      </div>
    );
  }

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
          {actingAs && <ViewingAsToggle actingAs={actingAs} />}
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
            {user?.secondaryRoles?.includes('Student Librarian') && (
              <button 
                className={activeTab === 'duty-desk' ? 'portal-btn-primary' : 'portal-btn-secondary'}
                onClick={() => handleTabChange('duty-desk')}
                style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', background: activeTab === 'duty-desk' ? undefined : '#fef3c7', color: activeTab === 'duty-desk' ? undefined : '#92400e' }}
              >
                <i className="fas fa-id-badge" style={{ marginRight: 6 }}></i>Duty Desk (Staff)
              </button>
            )}
          </>
        )}
      </div>

      {/* STUDENT LIBRARIAN DUTY DESK */}
      {activeTab === 'duty-desk' && <StudentLibraryAssistantPage />}

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
            <div style={{ flex: 1, minWidth: 280 }}>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by title, author, or ISBN..."
                loading={loadingCatalog}
                onClear={() => setSearch('')}
                width="100%"
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
            <div style={{ padding: '24px 0' }}><SkeletonLoader type="card" count={6} /></div>
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
              <div style={{ padding: 20 }}><SkeletonLoader type="table" rows={5} columns={6} /></div>
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
              <div style={{ padding: 20 }}><SkeletonLoader type="table" rows={4} columns={5} /></div>
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
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.7)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            padding: 16 
          }}
        >
          <div 
            style={{ 
              background: '#ffffff', 
              borderRadius: 16, 
              width: '100%', 
              maxWidth: 520, 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div 
              style={{ 
                padding: '18px 24px', 
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                color: '#ffffff', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: '1.1rem' }}>
                  <i className="fas fa-bookmark" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Place Book Hold / Reservation</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Reserve from library catalog for pickup</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowReserveModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={submitReservation}>
              <div style={{ padding: '24px 24px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Book Card Preview */}
                <div 
                  style={{ 
                    background: '#f8fafc', 
                    borderRadius: 12, 
                    padding: '16px', 
                    border: '1px solid #e2e8f0', 
                    display: 'flex', 
                    gap: 16, 
                    alignItems: 'center' 
                  }}
                >
                  <div 
                    style={{ 
                      width: 60, 
                      height: 80, 
                      borderRadius: 8, 
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                      color: '#ffffff', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0,
                      boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' 
                    }}
                  >
                    <i className="fas fa-book-open" style={{ fontSize: '1.4rem', marginBottom: 4 }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em' }}>LIB</span>
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedBookToReserve.title}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                      by <strong style={{ color: '#334155' }}>{selectedBookToReserve.author}</strong>
                    </p>
                    
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {selectedBookToReserve.available > 0 ? (
                        <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          <i className="fas fa-check-circle mr-1" /> {selectedBookToReserve.available} copies available
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          <i className="fas fa-clock mr-1" /> On Loan (You will enter waitlist)
                        </span>
                      )}

                      {selectedBookToReserve.category && (
                        <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                          {typeof selectedBookToReserve.category === 'object' ? (selectedBookToReserve.category as any)?.name : selectedBookToReserve.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Policy Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                      <i className="fas fa-clock mr-1" /> Hold Period
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
                      48 hours to collect after ready
                    </div>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                      <i className="fas fa-calendar-check mr-1" /> Loan Term
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: 600 }}>
                      Standard 14 days borrowing
                    </div>
                  </div>
                </div>

                {/* Reservation Notes */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, fontSize: '0.85rem', color: '#334155' }}>
                    Special Request or Study Reason (Optional)
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="e.g. For Form 4 Literature term paper, need chapter on poetry analysis..."
                    value={reserveNotes}
                    onChange={e => setReserveNotes(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: 8, 
                      border: '1.5px solid #cbd5e1', 
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div 
                style={{ 
                  padding: '16px 24px', 
                  background: '#f8fafc', 
                  borderTop: '1px solid #edf2f7', 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: 12 
                }}
              >
                <button 
                  type="button" 
                  onClick={() => setShowReserveModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={reserving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: reserving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {reserving ? (
                    <><i className="fas fa-spinner fa-spin" /> Submitting Request...</>
                  ) : (
                    <><i className="fas fa-bookmark" /> Confirm Reservation</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
