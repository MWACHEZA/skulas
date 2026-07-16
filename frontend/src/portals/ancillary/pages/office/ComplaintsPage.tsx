import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { useTerminology } from '../../../../hooks/useTerminology';
import '../../../../styles/portal.css';

interface Complaint {
  id: string;
  complainType: string;
  source: string;
  complainBy: string;
  phone: string;
  date: string;
  actionTaken: string | null;
  assignedTo: string | null;
  description: string | null;
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

export default function ComplaintsPage() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [complainType, setComplainType] = useState('');
  const [source, setSource] = useState('');
  const [complainBy, setComplainBy] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/reception/complaints');
      setComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load complaints', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/reception/complaints', {
        complainType,
        source,
        complainBy,
        phone,
        date,
        actionTaken,
        assignedTo,
        description
      });
      showToast('Complaint added successfully!', 'success');
      resetForm();
      setShowModal(false);
      fetchComplaints();
    } catch (error) {
      showToast('Failed to add complaint', 'error');
    
    }
  };

  const resetForm = () => {
    setComplainType(''); setSource(''); setComplainBy(''); setPhone('');
    setDate(''); setActionTaken(''); setAssignedTo(''); setDescription('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    try {
      await api.delete(`/api/reception/complaints/${id}`);
      showToast('Complaint deleted successfully', 'success');
      fetchComplaints();
    } catch (error) {
      showToast('Failed to delete complaint', 'error');
    
    }
  };

  const filteredComplaints = complaints.filter(c => 
    c.complainBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.complainType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-content">
          <h1>People Complaints</h1>
          <p>Track and resolve complaints raised by {t('students')}, {t('parents')}, or visitors.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--school-primary, #0056b3)', border: 'none' }}
        >
          <i className="fas fa-plus mr-2"></i>Add Complaint
        </button>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}><i className="fas fa-list mr-2"></i> Complaint Registry</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button 
              className="portal-btn-secondary" 
              onClick={() => {
                const headers = ['Complain Type', 'Complain By', 'Phone', 'Date', 'Action Taken', 'Assigned', 'Description'];
                const rows = filteredComplaints.map(c => [
                  c.complainType,
                  c.complainBy,
                  c.phone,
                  new Date(c.date).toLocaleDateString(),
                  c.actionTaken || '',
                  c.assignedTo || '',
                  c.description || ''
                ]);
                exportToCSV('People_Complaints', headers, rows);
              }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              className="portal-btn-secondary" 
              onClick={() => {
                const headers = ['Complain Type', 'Complain By', 'Phone', 'Date', 'Action Taken', 'Assigned', 'Description'];
                const rows = filteredComplaints.map(c => [
                  c.complainType,
                  c.complainBy,
                  c.phone,
                  new Date(c.date).toLocaleDateString(),
                  c.actionTaken || '',
                  c.assignedTo || '',
                  c.description || ''
                ]);
                exportToWord('People_Complaints', headers, rows);
              }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              className="portal-btn-secondary" 
              onClick={() => window.print()}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
            
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="portal-label">Search:</span>
              <input 
                type="text" 
                className="portal-input" 
                style={{ width: '200px' }} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>COMPLAIN TYPE</th>
                  <th>COMPLAIN BY</th>
                  <th>PHONE</th>
                  <th>DATE</th>
                  <th>ACTION TAKEN</th>
                  <th>ASSIGNED</th>
                  <th>DESCRIPTION</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                  </tr>
                ) : filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '8px' }}>
                        <i className="fas fa-folder-open" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                      </div>
                      <div style={{ fontWeight: 600 }}>No data available in table</div>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.complainType}</td>
                      <td>{c.complainBy}</td>
                      <td>{c.phone}</td>
                      <td>{new Date(c.date).toLocaleDateString()}</td>
                      <td>{c.actionTaken || '-'}</td>
                      <td>{c.assignedTo || '-'}</td>
                      <td>{c.description || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="portal-btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--portal-danger)', border: 'none' }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in fade-in zoom-in-95 duration-200" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Add Complaint</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="portal-label">Complain type <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={complainType} onChange={e => setComplainType(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="Academic">Academic</option>
                    <option value="Disciplinary">Disciplinary</option>
                    <option value="Facilities">Facilities</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Source <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={source} onChange={e => setSource(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="In-person">In-person</option>
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Complain by <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={complainBy} onChange={e => setComplainBy(e.target.value)} placeholder="Name" required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Phone <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Date <span style={{color:'red'}}>*</span></label>
                  <input type="date" className="portal-input" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Action taken</label>
                  <input type="text" className="portal-input" value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="Action taken" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Assigned</label>
                  <input type="text" className="portal-input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Assigned" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Description</label>
                  <textarea className="portal-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={3}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', border: 'none' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
