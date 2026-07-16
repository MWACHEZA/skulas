import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface LoanRecord {
  id: string;
  student: { user: { name: string } };
  book: { title: string; category: string };
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
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

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function LibraryLoans() {
  const { showToast } = useToast();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form states for new loan
  const [newLoan, setNewLoan] = useState({
    studentId: '',
    bookId: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/api/library/loans');
      setLoans(res.data);
    } catch (err) {
      showToast('Failed to fetch loan records', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await api.post(`/api/library/loans/${id}/return`);
      showToast('Book marked as returned successfully', 'success');
      fetchLoans();
    } catch (err) {
      showToast('Failed to process return', 'error');
    
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/library/loans/issue', newLoan);
      showToast('Book issued successfully', 'success');
      setShowIssueModal(false);
      fetchLoans();
    } catch (err) {
      showToast('Failed to issue book. Check availability.', 'error');
    
    }
  };

  if (loading) return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin mr-2"></i> Loading archives...</div>;

  return (
    <div className="library-portal-container" style={{ padding: '30px', minHeight: '100vh', background: '#f8faff' }}>
      <div className="portal-page-header" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#1e3a8a', fontSize: '2.4rem', fontWeight: 900 }}>Circulation Desk</h1>
          <p style={{ color: '#475569' }}>Real-time management of school library assets and student borrowings.</p>
        </div>
      </div>

      <div className="portal-card" style={{ background: 'white', borderRadius: '32px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-handshake mr-2"></i>Current Loan Records
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Student', 'Resource Title', 'Borrowed On', 'Return Deadline', 'Status'];
                const rows = loans.map(l => [
                  l.student?.user?.name || 'N/A',
                  l.book?.title || 'N/A',
                  new Date(l.borrowedAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  l.returnedAt ? 'Returned' : (new Date(l.dueDate) < new Date() ? 'Overdue' : 'On Loan')
                ]);
                exportToCSV('Library_Loans', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Student', 'Resource Title', 'Borrowed On', 'Return Deadline', 'Status'];
                const rows = loans.map(l => [
                  l.student?.user?.name || 'N/A',
                  l.book?.title || 'N/A',
                  new Date(l.borrowedAt).toLocaleDateString(),
                  new Date(l.dueDate).toLocaleDateString(),
                  l.returnedAt ? 'Returned' : (new Date(l.dueDate) < new Date() ? 'Overdue' : 'On Loan')
                ]);
                exportToWord('Library_Loans', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
            <button 
              onClick={() => setShowIssueModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#1e3a8a' }}
            >
              <i className="fas fa-plus mr-1"></i> Issue New Resource
            </button>
          </div>
        </div>
        
        <div style={{ padding: '0 20px 20px' }}>
          <table className="portal-table">
            <thead>
              <tr style={{ color: '#64748b' }}>
                <th style={{ padding: '20px' }}>Student</th>
                <th>Resource Information</th>
                <th>Borrowed On</th>
                <th>Return Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => {
                const isOverdue = !loan.returnedAt && new Date(loan.dueDate) < new Date();
                return (
                  <tr key={loan.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '25px 20px', fontWeight: 800, color: '#1e293b' }}>{loan.student?.user?.name}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{loan.book?.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Category: {loan.book?.category}</div>
                    </td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{new Date(loan.borrowedAt).toLocaleDateString()}</td>
                    <td style={{ color: isOverdue ? '#b91c1c' : '#64748b', fontWeight: 700 }}>
                      {new Date(loan.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`portal-badge ${loan.returnedAt ? 'success' : isOverdue ? 'danger' : 'info'}`} style={{ borderRadius: '10px' }}>
                        {loan.returnedAt ? 'Returned' : isOverdue ? 'Overdue' : 'On Loan'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!loan.returnedAt && (
                        <button 
                          onClick={() => handleReturn(loan.id)}
                          style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                          onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}
                        >
                          Confirm Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="portal-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>Hand Out Resource</h2>
              </div>
              <button className="close-panel" onClick={() => setShowIssueModal(false)}>&times;</button>
            </div>
            
            <div className="portal-modal-body" style={{ padding: '30px' }}>
              <form onSubmit={handleIssue}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="portal-label">Target Student ID</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="Paste student UUID..." 
                      required
                      value={newLoan.studentId}
                      onChange={e => setNewLoan({...newLoan, studentId: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Book Resource ID</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="Paste book UUID..." 
                      required
                      value={newLoan.bookId}
                      onChange={e => setNewLoan({...newLoan, bookId: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Return Deadline</label>
                    <input 
                      type="date" 
                      className="portal-input" 
                      required
                      value={newLoan.dueDate}
                      onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '12px', display: 'flex', gap: '10px', color: '#1e40af', fontSize: '0.9rem', marginBottom: '25px', border: '1px solid #bfdbfe' }}>
                  <i className="fas fa-info-circle" style={{ marginTop: '3px' }}></i>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>Issuing a resource decreases available inventory. Students will receive a notification to return the item by the chosen deadline.</p>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button 
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="portal-btn-ghost"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="portal-btn-primary"
                    style={{ flex: 1 }}
                  >
                    Finalize Loan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
