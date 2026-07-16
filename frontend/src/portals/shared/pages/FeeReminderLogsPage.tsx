import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

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

interface ReminderLog {
  id: string;
  studentId: string;
  student: {
    name: string;
  };
  source: string;
  status: 'SENT' | 'FAILED' | 'RETRYING';
  retries: number;
  lastAttempt: string;
  error?: string;
}

export default function FeeReminderLogsPage() {
  const { t } = useTerminology();
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    loadLogs();
  }, [statusFilter, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/fees/reminder-logs', {
        params: { status: statusFilter, startDate, endDate }
      });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Failed to synchronize notification audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await api.post(`/api/fees/reminder-logs/${id}/retry`);
      toast.success('Notification re-transmission authorized');
      loadLogs();
    } catch (error) {
      toast.error('Re-transmission request failed');
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Notification Audit Registry</h1>
          <p>Monitor automated institutional fee reminders, audit transmission statuses, and authorize re-transmission for failed notifications.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', fontWeight: 900 }}>
           <i className="fas fa-history mr-2"></i>COMMUNICATION LOGS
        </div>
      </div>

      {/* Filters */}
      <div className="portal-card animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', alignItems: 'end' }}>
          <div className="form-group">
            <label className="portal-label">Transmission Status</label>
            <select
              className="portal-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontWeight: 800 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Delivered Successfully</option>
              <option value="FAILED">Delivery Failure</option>
              <option value="RETRYING">Active Retransmission</option>
            </select>
          </div>
          <div className="form-group">
            <label className="portal-label">Archive Start Date</label>
            <input
              type="date"
              className="portal-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ fontWeight: 700 }}
            />
          </div>
          <div className="form-group">
            <label className="portal-label">Archive End Date</label>
            <input
              type="date"
              className="portal-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ fontWeight: 700 }}
            />
          </div>
          <button
            onClick={loadLogs}
            className="portal-btn-primary"
            style={{ height: '56px', fontWeight: 900, padding: '0 32px' }}
          >
            <i className="fas fa-sync-alt mr-2"></i> Refresh Audit
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Audit History</h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Detailed history of sent and failed notifications.</p>
          </div>
          <span className="status-badge" style={{ fontWeight: 900, background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9', padding: '8px 16px' }}>
            {(Array.isArray(logs) ? logs : []).length} LOG ENTRIES IDENTIFIED
          </span>
        </div>
        
        {/* ── Parameters ── */}
        <div className="portal-card" style={{ margin: '0 24px 24px 24px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
            <h4 style={{ margin: 0, color: '#475569', fontSize: '1rem', fontWeight: 800 }}>Audit Parameters</h4>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button 
                onClick={() => {
                  const headers = [`Recipient ${t('student')}`, 'Channel', 'Transmission Status', 'Attempts', 'Last Timestamp'];
                  const rows = logs.map(log => [
                    log.student?.name || 'Undefined Identity',
                    log.source || 'GENERAL',
                    log.status,
                    log.retries.toString(),
                    new Date(log.lastAttempt).toLocaleString()
                  ]);
                  exportToCSV('Fee_Reminder_Logs', headers, rows);
                }}
                className="portal-btn-ghost"
                style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0' }}
                title="Export to CSV"
              >
                <i className="fas fa-file-csv mr-2" style={{ color: '#059669' }}></i> CSV
              </button>
              <button 
                onClick={() => {
                  const headers = [`Recipient ${t('student')}`, 'Channel', 'Transmission Status', 'Attempts', 'Last Timestamp'];
                  const rows = logs.map(log => [
                    log.student?.name || 'Undefined Identity',
                    log.source || 'GENERAL',
                    log.status,
                    log.retries.toString(),
                    new Date(log.lastAttempt).toLocaleString()
                  ]);
                  exportToWord('Fee_Reminder_Logs', headers, rows);
                }}
                className="portal-btn-ghost"
                style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0' }}
                title="Export to Word"
              >
                <i className="fas fa-file-word mr-2" style={{ color: '#2563eb' }}></i> Word
              </button>
              <button 
                onClick={() => window.print()}
                className="portal-btn-ghost"
                style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0' }}
                title="Print / PDF"
              >
                <i className="fas fa-print mr-2" style={{ color: '#64748b' }}></i> Print/PDF
              </button>
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Recipient {t('student')}</th>
                <th style={{ textAlign: 'center', width: '15%' }}>Channel</th>
                <th style={{ textAlign: 'center', width: '15%' }}>Transmission</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Attempts</th>
                <th style={{ width: '20%' }}>Last Timestamp</th>
                <th style={{ textAlign: 'right', width: '15%' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing audit trail...</p>
                  </td>
                </tr>
              ) : (Array.isArray(logs) ? logs : []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '120px 24px', color: '#94a3b8' }}>
                    <i className="fas fa-clipboard-list" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                    <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Reminder Entries Identified</h3>
                    <p style={{ margin: 0, fontWeight: 600 }}>Archived communication logs will be rendered here.</p>
                  </td>
                </tr>
              ) : (Array.isArray(logs) ? logs : []).map(log => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 900, color: '#1e293b' }}>{log.student?.name || 'Undefined Identity'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>{t('student').toUpperCase()} ID: {log.studentId || 'N/A'}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="status-badge" style={{ 
                      fontSize: '0.65rem', fontWeight: 900, padding: '4px 12px', background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9'
                    }}>
                      <i className={`fas fa-${log.source === 'SMS' ? 'sms' : log.source === 'EMAIL' ? 'envelope' : 'bell'} mr-2`}></i>
                      {log.source?.replace('_', ' ')?.toUpperCase() || 'GENERAL'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="status-badge" style={{ 
                      background: log.status === 'SENT' ? '#ecfdf5' : log.status === 'FAILED' ? '#fef2f2' : '#fffbeb',
                      color: log.status === 'SENT' ? '#059669' : log.status === 'FAILED' ? '#dc2626' : '#d97706',
                      border: `1px solid ${log.status === 'SENT' ? '#d1fae5' : log.status === 'FAILED' ? '#fee2e2' : '#fef3c7'}`,
                      fontWeight: 900, fontSize: '0.75rem'
                    }}>
                      {log.status === 'SENT' ? <i className="fas fa-check-circle mr-1"></i> : 
                       log.status === 'FAILED' ? <i className="fas fa-exclamation-circle mr-1"></i> : 
                       <i className="fas fa-sync fa-spin mr-1"></i>}
                      {log.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 900, color: '#1e293b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem' }}>{log.retries}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>{new Date(log.lastAttempt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>{new Date(log.lastAttempt).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                      {log.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          className="portal-btn-primary"
                          style={{ padding: '8px 20px', fontSize: '0.75rem', fontWeight: 900, background: '#2563eb' }}
                        >
                          <i className="fas fa-redo mr-1"></i> Authorize Retry
                        </button>
                      )}
                      <button className="portal-btn-ghost" style={{ padding: '8px', color: '#2563eb' }} title="View Detailed Trace" onClick={() => setSelectedLog(log)}><i className="fas fa-eye"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Log Details Modal */}
      {selectedLog && (
        <div className="portal-modal-overlay" onClick={() => setSelectedLog(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
          <div className="portal-modal-content animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Audit Log Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="portal-label">Recipient</label>
                <div style={{ fontWeight: 800 }}>{selectedLog.student?.name || 'Undefined Identity'}</div>
              </div>
              <div>
                <label className="portal-label">Channel</label>
                <div style={{ fontWeight: 800 }}>{selectedLog.source?.replace('_', ' ')?.toUpperCase() || 'GENERAL'}</div>
              </div>
              <div>
                <label className="portal-label">Status</label>
                <div style={{ fontWeight: 800 }}>{selectedLog.status}</div>
              </div>
              <div>
                <label className="portal-label">Attempts</label>
                <div style={{ fontWeight: 800 }}>{selectedLog.retries}</div>
              </div>
              <div>
                <label className="portal-label">Last Timestamp</label>
                <div style={{ fontWeight: 800 }}>{new Date(selectedLog.lastAttempt).toLocaleString()}</div>
              </div>
              {selectedLog.error && (
                <div>
                  <label className="portal-label">Error Trace</label>
                  <pre style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', whiteSpace: 'pre-wrap', border: '1px solid #fecaca' }}>{selectedLog.error}</pre>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button onClick={() => setSelectedLog(null)} className="portal-btn-secondary" style={{ padding: '8px 24px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
