import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../../../lib/api';

interface LeaveEntry {
  id: string;
  user: { name: string };
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

export default function ListLeaves() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      // In a real scenario, this would be an admin endpoint to get ALL leaves, not just the user's
      const response = await api.get('/api/leave');
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to fetch leaves', error);
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h3>Employee Leave Registry</h3>
        <p>Manage and track leave requests for all school staff</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Copy</button>
            <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>CSV</button>
            <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Excel</button>
            <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>PDF</button>
            <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Print</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Search:</span>
            <input type="text" className="portal-input" style={{ width: '200px', padding: '8px 12px' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="management-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>START DATE</th>
                <th>END DATE</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading leaves...</td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b' }}></i>
                      <span>No data available in table</span>
                    </div>
                  </td>
                </tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{leave.user?.name || 'Unknown'}</td>
                    <td>{leave.startDate ? format(new Date(leave.startDate), 'dd/MM/yyyy') : 'N/A'}</td>
                    <td>{leave.endDate ? format(new Date(leave.endDate), 'dd/MM/yyyy') : 'N/A'}</td>
                    <td className="truncate max-w-[200px]" title={leave.reason}>{leave.reason}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: leave.status === 'Approved' ? 'rgba(56, 161, 105, 0.1)' : leave.status === 'Pending' ? 'rgba(214, 158, 46, 0.1)' : 'rgba(229, 62, 62, 0.1)', 
                        color: leave.status === 'Approved' ? 'var(--portal-success)' : leave.status === 'Pending' ? 'var(--portal-warning)' : 'var(--portal-danger)'
                      }}>
                        {leave.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                        <button className="portal-btn-ghost" style={{ color: '#00bcd4', padding: '6px', minWidth: 'auto', display: 'inline-block' }} title="Edit" onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="portal-btn-ghost" style={{ color: 'var(--portal-danger)', padding: '6px', minWidth: 'auto', display: 'inline-block' }} title="Delete" onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.9rem' }}>
            <span>Showing {leaves.length > 0 ? 1 : 0} to {leaves.length} of {leaves.length} entries</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
              <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
