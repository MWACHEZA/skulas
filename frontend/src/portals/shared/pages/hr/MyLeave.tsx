import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { format } from 'date-fns';

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

export default function MyLeave() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/api/leave/my');
      setLeaves(res.data);
    } catch (error) {
      console.error('Error fetching leaves', error);
    
    }
  };

  const filteredLeaves = leaves.filter(l => {
    const reasonText = l.reason || '';
    const statusText = l.status || '';
    return reasonText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSave = async () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/leave', formData);
      showToast('Leave application submitted successfully', 'success');
      fetchLeaves();
      setFormData({ startDate: '', endDate: '', reason: '' });
      setShowAddModal(false);
    } catch (error) {
      showToast('Failed to submit leave application', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>My leave application</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Right Table (Now Full Width) */}
        <div className="portal-card" style={{ width: '100%' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
              <i className="fas fa-list mr-2"></i>LEAVE HISTORY
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
              <button 
                onClick={() => {
                  const headers = ['ID', 'Start Date', 'End Date', 'Reason', 'Status'];
                  const rows = filteredLeaves.map(leave => [
                    leave.id.substring(0, 8),
                    format(new Date(leave.startDate), 'yyyy-MM-dd'),
                    format(new Date(leave.endDate), 'yyyy-MM-dd'),
                    leave.reason || '',
                    leave.status
                  ]);
                  exportToCSV('My_Leaves', headers, rows);
                }}
                className="portal-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                title="Export to CSV"
              >
                <i className="fas fa-file-csv mr-1"></i> CSV
              </button>
              <button 
                onClick={() => {
                  const headers = ['ID', 'Start Date', 'End Date', 'Reason', 'Status'];
                  const rows = filteredLeaves.map(leave => [
                    leave.id.substring(0, 8),
                    format(new Date(leave.startDate), 'yyyy-MM-dd'),
                    format(new Date(leave.endDate), 'yyyy-MM-dd'),
                    leave.reason || '',
                    leave.status
                  ]);
                  exportToWord('My_Leaves', headers, rows);
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
                onClick={() => setShowAddModal(true)}
                className="portal-btn-primary"
                style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
              >
                <i className="fas fa-plus-circle"></i> APPLY FOR LEAVE
              </button>
            </div>
          </div>
          <div className="portal-card-body" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 10 }}>Search:</span>
                <input 
                  type="text" 
                  className="portal-input" 
                  style={{ width: 200, padding: '5px 10px' }} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <table className="portal-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                  <th>OPTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#a0aec0' }}>
                    <span>No leave records found.</span>
                  </td></tr>
                ) : (
                  filteredLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>{leave.id.substring(0, 8)}</td>
                      <td>{format(new Date(leave.startDate), 'yyyy-MM-dd')}</td>
                      <td>{format(new Date(leave.endDate), 'yyyy-MM-dd')}</td>
                      <td>{leave.reason?.substring(0, 20)}...</td>
                      <td>
                        <span style={{ background: leave.status === 'Pending' ? '#ed8936' : leave.status === 'Approved' ? 'var(--portal-success)' : 'var(--portal-danger)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
                          {leave.status}
                        </span>
                      </td>
                      <td>
                        <button className="portal-btn-secondary" style={{ padding: '2px 6px', color: 'white', background: 'var(--portal-success)', border: 'none', marginRight: 5 }} onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="portal-btn-secondary" style={{ padding: '2px 6px', color: 'white', background: 'var(--portal-danger)', border: 'none' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '0.9rem' }}>
               <span>Showing 1 to {leaves.length} of {leaves.length} entries</span>
               <div>
                  <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginRight: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
                  <span style={{ background: '#4299e1', color: 'white', padding: '2px 8px', borderRadius: '50%', margin: '0 5px' }}>1</span>
                  <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginLeft: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Leave Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>APPLY FOR LEAVE</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Submit a new leave application</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <div className="portal-form-group" style={{ marginBottom: '15px' }}>
                <label className="portal-label">Start date <span style={{ color: 'red' }}>*</span></label>
                <input type="date" className="portal-input" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
              </div>

              <div className="portal-form-group" style={{ marginBottom: '15px' }}>
                <label className="portal-label">End date <span style={{ color: 'red' }}>*</span></label>
                <input type="date" className="portal-input" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>

              <div className="portal-form-group" style={{ marginBottom: '20px' }}>
                <label className="portal-label">Reason <span style={{ color: 'red' }}>*</span></label>
                <textarea className="portal-input" rows={5} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-neutral">
                  Cancel
                </button>
                <button className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
