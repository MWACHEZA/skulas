import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

interface LeaveEntry {
  id: string;
  user: { name: string };
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

export default function ListLeaves() {
  const { showToast } = useToast();
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveEntry | null>(null);
  const [editStatus, setEditStatus] = useState('Pending');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/api/leave');
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to fetch leaves', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedLeave) return;
    setSaving(true);
    try {
      await api.patch(`/api/leave/${selectedLeave.id}/status`, { status: editStatus });
      setShowEditModal(false);
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error) {
      console.error('Failed to update leave status', error);
      showToast('Failed to update leave status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this leave application?'))) return;
    try {
      await api.delete(`/api/leave/${id}`);
      fetchLeaves();
    } catch (error) {
      console.error('Failed to delete leave', error);
      showToast('Failed to delete leave', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = ['Employee', 'Start Date', 'End Date', 'Reason', 'Status'];
    const rows = leaves.map(l => [
      l.user?.name || 'N/A',
      new Date(l.startDate).toLocaleDateString(),
      new Date(l.endDate).toLocaleDateString(),
      l.reason || '',
      l.status
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leave_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = () => {
    const rows = leaves.map(l => `
      <tr>
        <td style="border: 1px solid #cccccc; padding: 8px;">${l.user?.name || 'N/A'}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${new Date(l.startDate).toLocaleDateString()}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${new Date(l.endDate).toLocaleDateString()}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${l.reason || ''}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${l.status}</td>
      </tr>
    `).join('');
    
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Employee Leave Registry</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cccccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Employee Leave Registry</h2>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leave_registry_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <button onClick={handleExportExcel} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-file-excel"></i> Excel
            </button>
            <button onClick={handleExportWord} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-file-word"></i> Word
            </button>
            <button onClick={handlePrint} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-print"></i> Print
            </button>
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
                        <button 
                          className="portal-btn-ghost" 
                          style={{ color: '#00bcd4', padding: '6px', minWidth: 'auto', display: 'inline-block' }} 
                          title="Edit" 
                          onClick={() => {
                            setSelectedLeave(leave);
                            setEditStatus(leave.status);
                            setShowEditModal(true);
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ color: 'var(--portal-danger)', padding: '6px', minWidth: 'auto', display: 'inline-block' }} 
                          title="Delete" 
                          onClick={() => handleDelete(leave.id)}
                        >
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
              <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => showToast('This feature is currently under development or disabled.', 'info')}>Previous</button>
              <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => showToast('This feature is currently under development or disabled.', 'info')}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && selectedLeave && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 400 }}>
            <div className="portal-modal-header">
              <h2>Update Leave Status</h2>
              <button className="modal-close" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ marginBottom: 15 }}>
                <strong>Employee:</strong> {selectedLeave.user?.name}
              </div>
              <div style={{ marginBottom: 15 }}>
                <strong>Reason:</strong> {selectedLeave.reason}
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label className="portal-label">Status</label>
                  <select
                    className="portal-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button type="button" className="portal-btn-neutral" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="button" className="portal-btn-primary" onClick={handleUpdateStatus} disabled={saving}>
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
