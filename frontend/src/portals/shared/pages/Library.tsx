import { useEffect, useState, useMemo } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

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
}

interface BookLoan {
  id: string;
  dueDate: string;
  borrowedAt: string;
  loanType: string;
  status: string;
  notes?: string;
  book: {
    title: string;
    author: string;
    isbn?: string;
    category?: string;
  };
}

export default function Library() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const { t, isMedical } = useTerminology();
  const { showToast } = useToast();

  useEffect(() => {
    fetchCatalog();
    fetchLoans();
  }, []);

  const fetchCatalog = async () => {
    try {
      setLoadingCatalog(true);
      const res = await api.get('/api/library/books');
      setBooks(res.data);
    } catch (err) {
      console.error('Library catalog fetch error:', err);
    
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchLoans = async () => {
    try {
      setLoadingLoans(true);
      const res = await api.get('/api/library/my-books');
      setLoans(res.data);
    } catch (err) {
      console.error('Library loans fetch error:', err);
    
    } finally {
      setLoadingLoans(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category?.name || b.categoryName || 'Uncategorized').filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) || 
                           b.author.toLowerCase().includes(search.toLowerCase());
      const catName = b.category?.name || b.categoryName || 'Uncategorized';
      const matchesCat = activeCategory === 'All' || catName === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [books, search, activeCategory]);

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <>
      <div className="portal-page-header">
        <h1>{isMedical ? 'Medical Resource Center' : 'Library & Loans'}</h1>
        <p>Discover {t('resources').toLowerCase()} and manage materials in your possession.</p>
        
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <button 
            className={activeTab === 'catalog' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('catalog')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-book" style={{ marginRight: 6 }}></i>Resource Catalog
          </button>
          <button 
            className={activeTab === 'loans' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('loans')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-book-reader" style={{ marginRight: 6 }}></i>My Loans
          </button>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <>
          {/* Discovery Controls */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}></i>
              <input 
                type="text" 
                placeholder="Search by title or author..." 
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
              No books found in this category matching your search.
            </div>
          ) : (
            <div className="portal-grid-3">
              {filteredBooks.map(book => {
                const catName = book.category?.name || book.categoryName || 'Uncategorized';
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
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#718096' }}>by {book.author}</p>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: book.available > 0 ? 'var(--portal-success)' : 'var(--portal-danger)' }}>
                            {book.available > 0 ? `${book.available} Available` : 'Out of Stock'}
                          </span>
                          {book.pdfUrl && (
                            <a 
                              href={`/api/storage/${book.pdfUrl}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="portal-badge success" 
                              style={{ textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <i className="fas fa-file-pdf"></i> Read PDF
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* My Loans View */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-book-bookmark" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>My Library Loans</h2>
              <span style={{ fontSize: '0.85rem', color: '#718096' }}>{loans.length} Borrowed Items</span>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              {loadingLoans ? (
                <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading borrowed items...</div>
              ) : loans.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No library books currently loaned in your name.</div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Loan Type</th>
                      <th>Issued Date</th>
                      <th>Return Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.book.title}</div>
                          {l.book.isbn && <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>ISBN: {l.book.isbn}</span>}
                        </td>
                        <td style={{ color: '#4a5568' }}>{l.book.author}</td>
                        <td>
                          <span className={`portal-badge ${l.loanType === 'TEXTBOOK' ? 'info' : 'warning'}`}>
                            {l.loanType}
                          </span>
                        </td>
                        <td>{new Date(l.borrowedAt).toLocaleDateString()}</td>
                        <td>{new Date(l.dueDate).toLocaleDateString()}</td>
                        <td>
                          {l.status === 'returned' ? (
                            <span className="portal-badge success">Returned</span>
                          ) : isOverdue(l.dueDate) ? (
                            <span className="portal-badge danger">Overdue</span>
                          ) : (
                            <span className="portal-badge warning">Borrowed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
