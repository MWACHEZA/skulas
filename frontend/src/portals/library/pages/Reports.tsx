import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import '../../../styles/portal.css';

export default function LibraryReports() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'overdue' | 'inventory' | 'trends'>('overdue');

  useEffect(() => {
    api.get('/api/library/reports')
      .then(res => setReportData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="portal-card" style={{ padding: '100px', textAlign: 'center' }}><div className="portal-spinner" style={{ margin: '0 auto 20px' }}></div><p style={{ fontWeight: 800, color: '#64748b' }}>Generating analytical library reports...</p></div>;
  if (!reportData) return <div className="portal-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--portal-danger)', fontWeight: 900 }}>Failed to load library reports.</div>;

  const { summary, overdueLoans = [], inventory = [], trends = [] } = reportData;

  return (
    <div className="portal-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="portal-page-header">
        <h1>Library Intelligence & Reports</h1>
        <p>Real-time collection audits, circulation trends, and overdue tracking.</p>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button 
            className={subTab === 'overdue' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setSubTab('overdue')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-clock mr-2"></i>Overdue Returns ({overdueLoans.length})
          </button>
          <button 
            className={subTab === 'inventory' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setSubTab('inventory')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-boxes mr-2"></i>Detailed Inventory ({inventory.length})
          </button>
          <button 
            className={subTab === 'trends' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setSubTab('trends')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-fire mr-2"></i>Borrowing Trends (Top 10)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-book"></i></div>
          <div className="portal-stat-info">
            <h3>{summary.totalVolumes.toLocaleString()}</h3>
            <p>Total Volumes</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-exchange-alt"></i></div>
          <div className="portal-stat-info">
            <h3>{summary.activeLoans}</h3>
            <p>Active Loans</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info">
            <h3>{summary.overdueLoansCount}</h3>
            <p>Overdue Items</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-layer-group"></i></div>
          <div className="portal-stat-info">
            <h3>{summary.uniqueTitles}</h3>
            <p>Unique Titles</p>
          </div>
        </div>
      </div>

      {/* Content tabs */}
      {subTab === 'overdue' ? (
        <div className="management-table-card animate-in fade-in duration-300">
          <div className="portal-card-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}><i className="fas fa-calendar-times mr-2 text-danger"></i>Overdue Book Returns</h2>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px' }}>Book Title</th>
                  <th>Borrower</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Overdue Duration</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', fontWeight: 700 }}>
                      No overdue books currently on record.
                    </td>
                  </tr>
                ) : (
                  overdueLoans.map((loan: any) => {
                    const daysOverdue = Math.floor((new Date().getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={loan.id}>
                        <td style={{ padding: '16px 20px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{loan.book?.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>By {loan.book?.author}</div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 800, color: '#475569' }}>{loan.student?.name || loan.user?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>{loan.student?.studentId || loan.user?.email || 'N/A'}</div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#475569' }}>{new Date(loan.borrowedAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 800, color: 'var(--portal-danger)' }}>{new Date(loan.dueDate).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 900, color: '#b91c1c' }}>
                          {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Due today'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="status-badge" style={{ background: '#fee2e2', color: 'var(--portal-danger)', borderColor: '#fecaca', fontWeight: 900, fontSize: '0.75rem' }}>
                            OVERDUE
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'inventory' ? (
        <div className="management-table-card animate-in fade-in duration-300">
          <div className="portal-card-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}><i className="fas fa-book-open mr-2 text-primary"></i>Collection Inventory Audit</h2>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px' }}>Title & Author</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Total Copies</th>
                  <th style={{ textAlign: 'center' }}>Available</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', fontWeight: 700 }}>
                      No books found in the collection.
                    </td>
                  </tr>
                ) : (
                  inventory.map((book: any) => (
                    <tr key={book.id}>
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{book.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>By {book.author}</div>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 800, color: '#475569' }}>{book.isbn || 'N/A'}</span></td>
                      <td><span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#dbeafe', fontWeight: 800 }}>{book.category?.name || 'Uncategorized'}</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#334155' }}>{book.copies}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, color: book.available > 0 ? '#059669' : '#d97706' }}>
                        {book.available}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-badge" style={{ 
                          background: book.available > 0 ? '#ecfdf5' : '#fffbeb',
                          color: book.available > 0 ? '#059669' : '#d97706',
                          borderColor: book.available > 0 ? '#a7f3d0' : '#fef3c7',
                          fontWeight: 900,
                          fontSize: '0.75rem'
                        }}>
                          {book.available > 0 ? 'AVAILABLE' : 'ALL LOANED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="management-table-card animate-in fade-in duration-300">
          <div className="portal-card-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}><i className="fas fa-chart-line mr-2 text-success"></i>Popular Collection Trends (Borrow Count)</h2>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px', width: '60px', textAlign: 'center' }}>Rank</th>
                  <th>Title & Author</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Times Borrowed</th>
                  <th>Borrow Distribution Visual</th>
                </tr>
              </thead>
              <tbody>
                {trends.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', fontWeight: 700 }}>
                      No borrow history to compile trends.
                    </td>
                  </tr>
                ) : (
                  trends.map((trend: any, index: number) => {
                    const maxBorrows = Math.max(...trends.map((t: any) => t.borrowCount), 1);
                    const percent = (trend.borrowCount / maxBorrows) * 100;
                    return (
                      <tr key={trend.id}>
                        <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 900, color: index === 0 ? '#eab308' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#64748b' }}>
                          {index + 1}
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{trend.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>By {trend.author}</div>
                          </div>
                        </td>
                        <td><span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#dbeafe', fontWeight: 800 }}>{trend.category}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--school-primary, #3182ce)', fontSize: '1rem' }}>{trend.borrowCount}</td>
                        <td style={{ width: '30%', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 8 }}>
                              <div style={{ width: `${percent}%`, height: '100%', borderRadius: 4, background: 'var(--school-primary, #3182ce)' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
