import { useEffect, useState, useMemo } from 'react';
import api from '../../../lib/api';

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

export default function StudentMyBooks() {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/students/me/books')
      .then(res => setLoans(res.data))
      .catch(err => console.error('Failed to fetch books:', err))
      .finally(() => setLoading(false));
  }, []);

  const textbooks = useMemo(() => loans.filter(l => l.loanType === 'TEXTBOOK'), [loans]);
  const libraryBooks = useMemo(() => loans.filter(l => l.loanType === 'LIBRARY'), [loans]);

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <>
      <div className="portal-page-header">
        <h1>My School Books</h1>
        <p>Manage the curriculum textbooks and library resources currently in your care.</p>
      </div>

      {/* Curriculum Textbooks Section */}
      <div className="portal-card" style={{ marginBottom: 30 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-book-bookmark" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Curriculum Textbooks</h2>
          <span style={{ fontSize: '0.85rem', color: '#718096' }}>{textbooks.length} Active Items</span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading books...</div>
          ) : textbooks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No curriculum books currently issued.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Issued Date</th>
                  <th>Return Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {textbooks.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.book.title}</td>
                    <td>{new Date(l.borrowedAt).toLocaleDateString()}</td>
                    <td style={{ color: isOverdue(l.dueDate) ? 'var(--portal-danger)' : '#718096', fontWeight: 600 }}>
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`portal-badge ${isOverdue(l.dueDate) ? 'danger' : 'success'}`}>
                        {isOverdue(l.dueDate) ? 'OVERDUE' : 'Issued'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Library Loans Section */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-library" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>General Library Loans</h2>
          <span style={{ fontSize: '0.85rem', color: '#718096' }}>{libraryBooks.length} Active Items</span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? null : libraryBooks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No general library books borrowed.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Return Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {libraryBooks.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.book.title}</td>
                    <td style={{ color: '#718096' }}>{l.book.author}</td>
                    <td style={{ color: isOverdue(l.dueDate) ? 'var(--portal-danger)' : '#718096', fontWeight: 600 }}>
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`portal-badge ${isOverdue(l.dueDate) ? 'danger' : 'info'}`}>
                        {isOverdue(l.dueDate) ? 'OVERDUE' : 'Borrowed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24, background: 'rgba(49, 130, 206, 0.05)', border: '1px solid rgba(49, 130, 206, 0.2)' }}>
        <div className="portal-card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: 'var(--school-primary, #3182ce)', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fas fa-info-circle"></i>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#2c5282' }}>
            <strong>Note:</strong> All school books must be returned in good condition by the specified due date to avoid fines or replacement costs.
          </p>
        </div>
      </div>
    </>
  );
}
