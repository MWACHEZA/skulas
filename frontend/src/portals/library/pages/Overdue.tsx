import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface OverdueRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  accessionNumber: string;
  borrowerName: string;
  borrowerType: 'Student' | 'Staff';
  borrowerPhone: string;
  dueDate: string;
  daysOverdue: number;
  fineSoFar: number;
  waivedFine: number;
  paidFine: number;
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

export default function LibraryOverdue() {
  const { showToast } = useToast();
  const [overdue, setOverdue] = useState<OverdueRecord[]>([]);
  const [stats, setStats] = useState({ totalOverdueCount: 0, totalFineOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [filterBucket, setFilterBucket] = useState<'all' | 'today' | '1-7' | '7-30' | '30+'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Waive fine modal state
  const [waiveModalLoan, setWaiveModalLoan] = useState<OverdueRecord | null>(null);
  const [waiveType, setWaiveType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [waiveReason, setWaiveReason] = useState<string>('');
  const [waiving, setWaiving] = useState(false);

  useEffect(() => {
    fetchOverdue();
  }, [filterBucket]);

  const fetchOverdue = async () => {
    setLoading(true);
    try {
      const param = filterBucket !== 'all' ? `?filter=${filterBucket}` : '';
      const res = await api.get(`/api/library/loans/overdue${param}`);
      if (res.data?.overdueLoans) {
        setOverdue(res.data.overdueLoans);
        setStats(res.data.stats || { totalOverdueCount: 0, totalFineOutstanding: 0 });
      } else if (Array.isArray(res.data)) {
        setOverdue(res.data);
      }
    } catch (err) {
      showToast('Failed to load overdue records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      const res = await api.post(`/api/library/loans/${id}/send-reminder`);
      showToast(res.data?.message || `Reminder sent to ${name}`, 'success');
      fetchOverdue();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to dispatch reminder', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendAllReminders = async () => {
    if (!window.confirm(`Broadcast overdue notifications to all ${overdue.length} borrowers?`)) return;
    setActionLoading('ALL');
    try {
      const res = await api.post('/api/library/reminders/trigger');
      showToast(res.data?.message || 'Automated reminder batch executed successfully', 'success');
      fetchOverdue();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to trigger batch reminders', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReturned = async (id: string, title: string) => {
    if (!window.confirm(`Mark book "${title}" as returned?`)) return;
    setActionLoading(id);
    try {
      await api.post(`/api/library/loans/${id}/return`);
      showToast('Book marked as returned and inventory incremented', 'success');
      fetchOverdue();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process return', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWaiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiveModalLoan) return;

    setWaiving(true);
    try {
      const fullWaive = waiveType === 'FULL';
      const amount = fullWaive ? waiveModalLoan.fineSoFar : parseFloat(partialAmount || '0');

      await api.post(`/api/library/loans/${waiveModalLoan.id}/waive-fine`, {
        fullWaive,
        amount,
        reason: waiveReason
      });

      showToast(`Fine waived successfully ($${amount.toFixed(2)})`, 'success');
      setWaiveModalLoan(null);
      setPartialAmount('');
      setWaiveReason('');
      fetchOverdue();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to waive fine', 'error');
    } finally {
      setWaiving(false);
    }
  };

  return (
    <div className="library-portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-exclamation-triangle mr-3 text-danger" style={{ color: '#ef4444' }}></i>
            Overdue Loans & Fine Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Follow up on overdue library books, fine accruals, and reminder notifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="no-print">
          <button 
            onClick={() => {
              const headers = ['Borrower', 'Type', 'Phone', 'Book Title', 'Accession #', 'Due Date', 'Days Overdue', 'Accrued Fine ($)'];
              const rows = overdue.map(o => [
                o.borrowerName,
                o.borrowerType,
                o.borrowerPhone,
                o.bookTitle,
                o.accessionNumber,
                new Date(o.dueDate).toLocaleDateString(),
                o.daysOverdue.toString(),
                o.fineSoFar.toFixed(2)
              ]);
              exportToCSV('Overdue_Book_Loans', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-csv mr-1"></i> CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="portal-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-print mr-1"></i> Print
          </button>
          <button 
            onClick={handleSendAllReminders}
            disabled={actionLoading === 'ALL' || overdue.length === 0}
            className="portal-btn-primary" 
            style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#dc2626', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-paper-plane"></i>
            {actionLoading === 'ALL' ? 'Sending Reminders...' : 'Send All Reminders'}
          </button>
        </div>
      </div>

      {/* Top Stats Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#ffffff', padding: '18px 24px', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-book-dead"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overdue Volumes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalOverdueCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 24px', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-hand-holding-usd"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Fines Accrued</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
              ${stats.totalFineOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 24px', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-users"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Borrowers Affected</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e40af' }}>
              {new Set(overdue.map(o => o.borrowerName)).size}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginRight: 8 }}>Filter by Overdue Duration:</span>
        <button 
          onClick={() => setFilterBucket('all')} 
          className={filterBucket === 'all' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
        >
          All Overdue
        </button>
        <button 
          onClick={() => setFilterBucket('today')} 
          className={filterBucket === 'today' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
        >
          Due Today / 1 Day
        </button>
        <button 
          onClick={() => setFilterBucket('1-7')} 
          className={filterBucket === '1-7' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
        >
          1 – 7 Days
        </button>
        <button 
          onClick={() => setFilterBucket('7-30')} 
          className={filterBucket === '7-30' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
        >
          7 – 30 Days
        </button>
        <button 
          onClick={() => setFilterBucket('30+')} 
          className={filterBucket === '30+' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
        >
          30+ Days (Severe)
        </button>
      </div>

      {/* Overdue Items Table */}
      <div className="portal-card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin mr-2"></i> Analyzing overdue records...
          </div>
        ) : overdue.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: 12 }}></i>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', margin: 0 }}>No overdue loans in this category!</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>All borrowed books have been returned or are within their active loan periods.</p>
          </div>
        ) : (
          <table className="portal-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th>Borrower</th>
                <th>Resource Information</th>
                <th>Due Date</th>
                <th>Overdue Status</th>
                <th>Accrued Fine</th>
                <th style={{ textAlign: 'center' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.borrowerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`portal-badge ${item.borrowerType === 'Student' ? 'info' : 'warning'}`} style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                        {item.borrowerType}
                      </span>
                      {item.borrowerPhone && (
                        <span><i className="fas fa-phone mr-1"></i>{item.borrowerPhone}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.bookTitle}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Acc: {item.accessionNumber || 'N/A'}
                    </div>
                  </td>
                  <td style={{ color: '#475569', fontWeight: 600 }}>
                    {new Date(item.dueDate).toLocaleDateString()}
                  </td>
                  <td>
                    <span 
                      className={`portal-badge ${item.daysOverdue > 14 ? 'danger' : 'warning'}`}
                      style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <i className="fas fa-clock"></i>
                      {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} overdue
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: item.fineSoFar > 0 ? '#dc2626' : '#64748b', fontSize: '0.95rem' }}>
                      ${item.fineSoFar.toFixed(2)}
                    </div>
                    {item.waivedFine > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#059669' }}>
                        (Waived: ${item.waivedFine.toFixed(2)})
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }} className="no-print">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* Send Reminder */}
                      <button 
                        onClick={() => handleSendReminder(item.id, item.borrowerName)}
                        disabled={actionLoading === item.id}
                        className="portal-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6 }}
                        title="Send Reminder"
                      >
                        <i className="fas fa-bell text-warning"></i> Reminder
                      </button>

                      {/* Waive Fine Modal Trigger */}
                      <button 
                        onClick={() => {
                          setWaiveModalLoan(item);
                          setWaiveType('FULL');
                          setPartialAmount('');
                          setWaiveReason('');
                        }}
                        className="portal-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6 }}
                        title="Waive Fine"
                      >
                        <i className="fas fa-hand-holding-usd text-primary"></i> Waive
                      </button>

                      {/* Mark Returned */}
                      <button 
                        onClick={() => handleMarkReturned(item.id, item.bookTitle)}
                        disabled={actionLoading === item.id}
                        className="portal-btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, background: '#059669' }}
                        title="Mark Returned"
                      >
                        <i className="fas fa-check"></i> Return
                      </button>

                      {/* Call Action */}
                      {item.borrowerPhone && item.borrowerPhone !== '—' && (
                        <a 
                          href={`tel:${item.borrowerPhone}`}
                          className="portal-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6, color: '#2563eb' }}
                          title={`Call ${item.borrowerPhone}`}
                        >
                          <i className="fas fa-phone-alt"></i> Call
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Waive Fine Modal */}
      {waiveModalLoan && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 480 }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                  Waive Overdue Fine
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Borrower: <strong>{waiveModalLoan.borrowerName}</strong>
                </p>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer' }} onClick={() => setWaiveModalLoan(null)}>&times;</button>
            </div>

            <form onSubmit={handleWaiveSubmit} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fef3c7', padding: '12px 16px', borderRadius: 8, border: '1px solid #fde68a', fontSize: '0.85rem', color: '#92400e' }}>
                Total calculated fine: <strong>${waiveModalLoan.fineSoFar.toFixed(2)}</strong> ({waiveModalLoan.daysOverdue} days overdue)
              </div>

              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Waiver Type</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="waiveType" 
                      checked={waiveType === 'FULL'} 
                      onChange={() => setWaiveType('FULL')} 
                    />
                    Full Waiver (${waiveModalLoan.fineSoFar.toFixed(2)})
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="waiveType" 
                      checked={waiveType === 'PARTIAL'} 
                      onChange={() => setWaiveType('PARTIAL')} 
                    />
                    Partial Waiver
                  </label>
                </div>
              </div>

              {waiveType === 'PARTIAL' && (
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Amount to Waive ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    max={waiveModalLoan.fineSoFar}
                    required 
                    className="portal-input" 
                    placeholder="e.g. 5.00"
                    value={partialAmount} 
                    onChange={e => setPartialAmount(e.target.value)} 
                  />
                </div>
              )}

              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Reason / Authorization Note</label>
                <textarea 
                  rows={2} 
                  className="portal-input" 
                  placeholder="e.g. Approved by Head Librarian due to medical absence..."
                  value={waiveReason} 
                  onChange={e => setWaiveReason(e.target.value)} 
                />
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setWaiveModalLoan(null)} disabled={waiving}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={waiving} style={{ background: '#2563eb' }}>
                  {waiving ? 'Processing...' : 'Authorize Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
