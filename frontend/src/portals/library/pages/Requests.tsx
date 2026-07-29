import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { format } from 'date-fns';

interface Loan {
  id: string;
  bookId: string;
  studentId: string | null;
  userId: string | null;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
  loanType: string;
  book: { title: string; author: string; isbn: string };
  student?: { name: string; studentId: string; user?: { name: string } };
}

export default function LibraryRequests() {
  const { showToast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'borrowed' | 'returned' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/api/library/loans');
      setLoans(res.data);
    } catch {
      showToast('Failed to load loan records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    if (!confirm('Mark this book as returned?')) return;
    setReturningId(loanId);
    try {
      await api.post(`/api/library/loans/${loanId}/return`);
      showToast('Book marked as returned', 'success');
      fetchLoans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process return', 'error');
    } finally {
      setReturningId(null);
    }
  };

  const isOverdue = (loan: Loan) =>
    loan.status === 'borrowed' && new Date(loan.dueDate) < new Date();

  const filtered = loans.filter(l => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'overdue' ? isOverdue(l) :
      l.status === filter;
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      l.book?.title?.toLowerCase().includes(term) ||
      l.book?.author?.toLowerCase().includes(term) ||
      l.student?.name?.toLowerCase().includes(term) ||
      l.student?.studentId?.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: loans.length,
    active: loans.filter(l => l.status === 'borrowed').length,
    returned: loans.filter(l => l.status === 'returned').length,
    overdue: loans.filter(l => isOverdue(l)).length,
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Book Loans & Requests</h1>
        <p>Manage all book loans, track borrowing history, and process returns.</p>
      </div>

      {/* Stats */}
      <div className="portal-stats-grid" style={{ marginBottom: 24 }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-book"></i></div>
          <div className="portal-stat-info"><h3>{stats.total}</h3><p>Total Loans</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-book-open"></i></div>
          <div className="portal-stat-info"><h3>{stats.active}</h3><p>Currently Borrowed</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon info"><i className="fas fa-undo"></i></div>
          <div className="portal-stat-info"><h3>{stats.returned}</h3><p>Returned</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info"><h3>{stats.overdue}</h3><p>Overdue</p></div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h2><i className="fas fa-clipboard-list" style={{ marginRight: 8 }}></i>Loan Records</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'borrowed', 'returned', 'overdue'] as const).map(f => (
              <button
                key={f}
                className={filter === f ? 'portal-btn-primary' : 'portal-btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.82rem', textTransform: 'capitalize' }}
                onClick={() => setFilter(f)}
              >
                {f} {f === 'all' ? `(${stats.total})` : f === 'borrowed' ? `(${stats.active})` : f === 'returned' ? `(${stats.returned})` : `(${stats.overdue})`}
              </button>
            ))}
          </div>
        </div>

        <div className="portal-card-body">
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              className="portal-input"
              placeholder="Search by book title, author or student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)' }}></i>
              <p style={{ color: '#718096', marginTop: 12 }}>Loading loan records...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <i className="fas fa-hand-holding fa-3x" style={{ color: '#e2e8f0', marginBottom: 20 }}></i>
              <h3>No {filter === 'all' ? '' : filter} loans found</h3>
              <p style={{ color: '#718096' }}>
                {search ? `No results for "${search}"` : 'No loan records match the current filter.'}
              </p>
            </div>
          ) : (
            <div style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Borrower</th>
                    <th>Borrowed</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(loan => {
                    const overdue = isOverdue(loan);
                    const borrowerName = loan.student?.user?.name || loan.student?.name || `User ${loan.userId?.slice(0, 6)}`;
                    return (
                      <tr key={loan.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{loan.book?.title}</div>
                          <div style={{ color: '#718096', fontSize: '0.8rem' }}>{loan.book?.author}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{borrowerName}</div>
                          {loan.student?.studentId && (
                            <div style={{ color: '#a0aec0', fontSize: '0.78rem' }}>ID: {loan.student.studentId}</div>
                          )}
                        </td>
                        <td style={{ color: '#718096', fontSize: '0.85rem' }}>
                          {format(new Date(loan.borrowedAt), 'dd MMM yyyy')}
                        </td>
                        <td style={{ color: overdue ? '#dc2626' : '#718096', fontWeight: overdue ? 700 : 400, fontSize: '0.85rem' }}>
                          {format(new Date(loan.dueDate), 'dd MMM yyyy')}
                          {overdue && <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>OVERDUE</div>}
                        </td>
                        <td>
                          <span className={`portal-badge ${loan.status === 'returned' ? 'success' : overdue ? 'danger' : 'info'}`}>
                            {overdue && loan.status !== 'returned' ? 'Overdue' : loan.status}
                          </span>
                        </td>
                        <td>
                          {loan.status === 'borrowed' && (
                            <button
                              className="portal-btn-secondary"
                              style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                              disabled={returningId === loan.id}
                              onClick={() => handleReturn(loan.id)}
                            >
                              {returningId === loan.id
                                ? <i className="fas fa-spinner fa-spin"></i>
                                : <><i className="fas fa-undo" style={{ marginRight: 4 }}></i>Return</>
                              }
                            </button>
                          )}
                          {loan.status === 'returned' && (
                            <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>
                              {loan.returnedAt ? format(new Date(loan.returnedAt), 'dd MMM') : 'Returned'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
