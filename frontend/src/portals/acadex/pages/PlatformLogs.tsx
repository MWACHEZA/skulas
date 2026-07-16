import React, { useState } from 'react';
import '../../../styles/portal.css';

interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  ipAddress: string;
  targetSchool: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export default function PlatformLogs() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [logs] = useState<AuditLog[]>([
    { id: '109283', timestamp: '2026-04-17 08:45:12', event: 'School Provisioned', actor: 'System Admin', ipAddress: '192.168.1.45', targetSchool: 'AX-EMBAKWE', status: 'SUCCESS' },
    { id: '109284', timestamp: '2026-04-17 08:30:05', event: 'Failed Admin Login', actor: 'Admin (AX-C47ITS)', ipAddress: '41.221.144.10', targetSchool: 'AX-C47ITS', status: 'WARNING' },
    { id: '109285', timestamp: '2026-04-16 15:20:00', event: 'Subscription Upgraded (Starter -> Pro)', actor: 'Sales Executive', ipAddress: 'Internal', targetSchool: 'AX-ZCBCCH', status: 'SUCCESS' },
    { id: '109286', timestamp: '2026-04-16 14:10:33', event: 'API Integration Key Regenerated', actor: 'Admin (AX-EMBAKWE)', ipAddress: '154.120.90.11', targetSchool: 'AX-EMBAKWE', status: 'SUCCESS' },
    { id: '109287', timestamp: '2026-04-16 12:05:11', event: 'Database Connection Timeout', actor: 'System Worker', ipAddress: 'Internal DB', targetSchool: 'GLOBAL', status: 'ERROR' },
    { id: '109288', timestamp: '2026-04-15 09:30:00', event: 'Bulk Student Import', actor: 'Admin (AX-C47ITS)', ipAddress: '41.221.144.10', targetSchool: 'AX-C47ITS', status: 'SUCCESS' },
  ]);

  const filteredLogs = logs.filter(log => {
      if (filter !== 'ALL' && log.status !== filter) return false;
      if (search && !log.event.toLowerCase().includes(search.toLowerCase()) && !log.actor.toLowerCase().includes(search.toLowerCase()) && !log.targetSchool.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
  });

  return (
    <div className="platform-logs-container">
      <div className="portal-page-header">
        <h1>Platform Audit Logs</h1>
        <p>Review system-wide activities, security events, and administrative actions.</p>
      </div>

      <div className="portal-card mt-6">
        <div className="portal-card-header flex justify-between items-center bg-gray-50 border-b p-4">
            <div className="flex gap-4 items-center w-full max-w-2xl">
                 <div className="form-group mb-0 flex-1">
                     <div className="relative">
                        <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        <input 
                           type="text" 
                           className="form-control pl-10" 
                           placeholder="Search by event, actor, or school code..." 
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                     </div>
                 </div>
                 <select className="form-control w-48 mb-0" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="ALL">All Events</option>
                    <option value="SUCCESS">Success</option>
                    <option value="WARNING">Warnings</option>
                    <option value="ERROR">Errors</option>
                 </select>
            </div>
            
            <button className="portal-btn-secondary py-2" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download mr-2"></i>Export CSV</button>
        </div>

        <div className="management-table-card rounded-t-none">
            <table className="management-table">
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
                    {filteredLogs.map(log => (
                        <tr key={log.id}>
                            <td className="text-xs text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                            <td style={{ fontWeight: 600 }}>{log.event}</td>
                            <td>{log.actor}</td>
                            <td className="text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1">{log.ipAddress}</td>
                            <td>
                                {log.targetSchool === 'GLOBAL' ? (
                                    <span className="text-xs uppercase font-bold text-gray-500">Global System</span>
                                ) : (
                                    <span className="font-bold text-blue-600 cursor-pointer hover:underline">{log.targetSchool}</span>
                                )}
                            </td>
                            <td>
                                <span className={`status-badge ${log.status === 'SUCCESS' ? 'status-active' : log.status === 'WARNING' ? 'status-pending bg-orange-100 text-orange-800' : 'status-inactive bg-red-100 text-red-800'}`}>
                                    {log.status === 'ERROR' && <i className="fas fa-exclamation-triangle mr-1"></i>}
                                    {log.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-500">No logs found matching your criteria.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
