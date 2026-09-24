import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import '../../../styles/portal.css';
import { useToast } from '../../../context/ToastContext';

interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  ipAddress: string;
  targetSchool: string;
  schoolName?: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details?: any;
}

export default function PlatformLogs() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/audit/platform', {
        params: {
          status: filter,
          search: search.trim() || undefined
        }
      });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load platform logs:', err);
      showToast('Failed to fetch platform logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.event.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.targetSchool.toLowerCase().includes(q) ||
      (log.schoolName && log.schoolName.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('No logs to export', 'warning');
      return;
    }

    const headers = ['ID,Timestamp,Event,Actor,IP Address,Target School,School Name,Status'];
    const rows = filteredLogs.map(log =>
      `${log.id},"${log.timestamp}","${log.event.replace(/"/g, '""')}","${log.actor.replace(/"/g, '""')}",${log.ipAddress},${log.targetSchool},"${(log.schoolName || '').replace(/"/g, '""')}",${log.status}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `acadex_platform_audit_logs_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Platform audit logs exported successfully', 'success');
  };

  return (
    <div className="platform-logs-container">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <h1>Platform Audit Logs</h1>
          <p>Real-time system-wide telemetry, security events, and administrative operations recorded directly in PostgreSQL.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-secondary" onClick={fetchLogs} disabled={loading}>
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} style={{ marginRight: 6 }}></i> Refresh
          </button>
          <button className="portal-btn-primary" onClick={exportCSV} disabled={loading || filteredLogs.length === 0}>
            <i className="fas fa-download" style={{ marginRight: 6 }}></i> Export CSV
          </button>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 20 }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 650 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}></i>
              <input
                type="text"
                className="portal-input"
                style={{ paddingLeft: 34, width: '100%' }}
                placeholder="Search by event, actor, IP, or school code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="portal-btn-secondary" style={{ padding: '0 16px' }}>Search</button>
          </form>

          <select
            className="portal-input"
            style={{ width: 160 }}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="WARNING">Warnings</option>
            <option value="ERROR">Errors Only</option>
          </select>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p style={{ marginTop: 10, color: '#64748b' }}>Streaming live platform logs from database...</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Description</th>
                  <th>Actor</th>
                  <th>IP Address</th>
                  <th>Target School</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.event}</td>
                      <td style={{ fontSize: '0.85rem' }}>{log.actor}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#f1f5f9', padding: '3px 6px', borderRadius: 4 }}>
                          {log.ipAddress}
                        </span>
                      </td>
                      <td>
                        {log.targetSchool === 'GLOBAL' ? (
                          <span className="portal-badge neutral" style={{ fontSize: '0.75rem' }}>GLOBAL PLATFORM</span>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--portal-primary)', fontFamily: 'monospace' }}>
                              {log.targetSchool}
                            </span>
                            {log.schoolName && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.schoolName}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`portal-badge ${
                          log.status === 'SUCCESS' ? 'success' :
                          log.status === 'WARNING' ? 'warning' : 'danger'
                        }`}>
                          {log.status === 'ERROR' && <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No live platform logs match the specified criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
