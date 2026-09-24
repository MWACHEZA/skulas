import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../lib/api';
import '../../../styles/portal.css';

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
    coverUrl?: string;
  };
}

export default function StudentMyBooks() {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    fetchMyBooks();
    // Live ticking countdown every 60 seconds
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyBooks = () => {
    api.get('/api/students/me/books')
      .then(res => setLoans(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch books:', err))
      .finally(() => setLoading(false));
  };

  const textbooks = useMemo(() => loans.filter(l => l.loanType === 'TEXTBOOK'), [loans]);
  const libraryBooks = useMemo(() => loans.filter(l => l.loanType === 'LIBRARY'), [loans]);

  // Live countdown badge renderer
  const renderCountdownBadge = (dueDateString: string) => {
    const dueTime = new Date(dueDateString).getTime();
    const diffMs = dueTime - currentTime;

    if (diffMs < 0) {
      const overdueMs = Math.abs(diffMs);
      const overdueDays = Math.max(1, Math.floor(overdueMs / (1000 * 60 * 60 * 24)));
      return (
        <span 
          className="portal-badge danger" 
          style={{ 
            padding: '4px 10px', 
            borderRadius: '8px', 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '5px',
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #f87171'
          }}
        >
          <i className="fas fa-exclamation-circle"></i>
          Overdue by {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
        </span>
      );
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;

    let countdownText = '';
    if (days > 0) {
      countdownText = `Due in ${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      countdownText = `Due in ${hours}h ${mins}m`;
    } else {
      countdownText = `Due in ${mins} mins`;
    }

    return (
      <span 
        className="portal-badge success" 
        style={{ 
          padding: '4px 10px', 
          borderRadius: '8px', 
          fontSize: '0.8rem', 
          fontWeight: 800, 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '5px',
          background: '#f0fdf4',
          color: '#15803d',
          border: '1px solid #86efac'
        }}
      >
        <i className="fas fa-clock"></i>
        {countdownText}
      </span>
    );
  };

  return (
    <div className="portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      <div className="portal-page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          <i className="fas fa-book-reader mr-3 text-primary" style={{ color: '#2563eb' }}></i>
          My Borrowed Books
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
          Track active curriculum textbooks, library novels, and live return deadlines.
        </p>
      </div>

      {/* Curriculum Textbooks Section */}
      <div className="portal-card" style={{ marginBottom: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
        <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-book-bookmark mr-2" style={{ color: '#059669' }}></i>
            Curriculum Textbooks
          </h2>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 6 }}>
            {textbooks.length} Active Items
          </span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading curriculum records...
            </div>
          ) : textbooks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No curriculum textbooks currently issued.</div>
          ) : (
            <table className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155' }}>
                  <th>Title</th>
                  <th>Issued Date</th>
                  <th>Return Deadline</th>
                  <th>Time Remaining</th>
                </tr>
              </thead>
              <tbody>
                {textbooks.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{l.book.title}</td>
                    <td style={{ color: '#64748b' }}>{new Date(l.borrowedAt).toLocaleDateString()}</td>
                    <td style={{ color: '#334155', fontWeight: 600 }}>
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      {renderCountdownBadge(l.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Library Loans Section */}
      <div className="portal-card" style={{ marginBottom: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
        <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-university mr-2" style={{ color: '#2563eb' }}></i>
            General Library Borrowings
          </h2>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 6 }}>
            {libraryBooks.length} Active Items
          </span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? null : libraryBooks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No general library books currently borrowed.</div>
          ) : (
            <table className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155' }}>
                  <th>Title & Author</th>
                  <th>Borrowed Date</th>
                  <th>Return Deadline</th>
                  <th>Time Remaining</th>
                </tr>
              </thead>
              <tbody>
                {libraryBooks.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.book.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>by {l.book.author}</div>
                    </td>
                    <td style={{ color: '#64748b' }}>{new Date(l.borrowedAt).toLocaleDateString()}</td>
                    <td style={{ color: '#334155', fontWeight: 600 }}>
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      {renderCountdownBadge(l.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="portal-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ background: '#2563eb', color: 'white', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fas fa-info"></i>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.5 }}>
            <strong>Library Policy:</strong> Please return or renew your books before the deadline badge expires. Overdue loans accrue daily fines and will temporarily restrict checkout of new volumes.
          </p>
        </div>
      </div>
    </div>
  );
}
