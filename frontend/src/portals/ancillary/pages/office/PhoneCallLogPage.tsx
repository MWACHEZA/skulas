import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { useTerminology } from '../../../../hooks/useTerminology';
import '../../../../styles/portal.css';

interface CallLog {
  id: string;
  name: string;
  phone: string;
  date: string;
  callDuration: string | null;
  callType: string;
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

export default function PhoneCallLogPage() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [callDuration, setCallDuration] = useState('');
  const [callType, setCallType] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/reception/calls');
      setCalls(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load call logs', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/reception/calls', {
        name,
        phone,
        date,
        nextFollowUpDate,
        callDuration,
        callType,
        description
      });
      showToast('Call log added successfully!', 'success');
      resetForm();
      setShowModal(false);
      fetchCalls();
    } catch (error) {
      showToast('Failed to add call log', 'error');
    
    }
  };

  const resetForm = () => {
    setName(''); setPhone(''); setDate(''); setNextFollowUpDate('');
    setCallDuration(''); setCallType(''); setDescription('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this call log?')) return;
    try {
      await api.delete(`/api/reception/calls/${id}`);
      showToast('Call log deleted successfully', 'success');
      fetchCalls();
    } catch (error) {
      showToast('Failed to delete call log', 'error');
    
    }
  };

  const filteredCalls = calls.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.callType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-content">
          <h1>Phone Call Log</h1>
          <p>Track incoming and outgoing calls for {t('parents')}, prospective leads, or visitors.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--school-primary, #0056b3)', border: 'none' }}
        >
          <i className="fas fa-plus mr-2"></i>Add Phone Call Log
        </button>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}><i className="fas fa-list mr-2"></i> Phone Call Registry</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button 
              className="portal-btn-secondary" 
              onClick={() => {
                const headers = ['Name', 'Phone', 'Date', 'Call Duration', 'Call Type', 'Description'];
                const rows = filteredCalls.map(c => [
                  c.name || '',
                  c.phone,
                  new Date(c.date).toLocaleDateString(),
                  c.callDuration || '',
                  c.callType,
                  c.description || ''
                ]);
                exportToCSV('Phone_Call_Logs', headers, rows);
              }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              className="portal-btn-secondary" 
              onClick={() => {
                const headers = ['Name', 'Phone', 'Date', 'Call Duration', 'Call Type', 'Description'];
                const rows = filteredCalls.map(c => [
                  c.name || '',
                  c.phone,
                  new Date(c.date).toLocaleDateString(),
                  c.callDuration || '',
                  c.callType,
                  c.description || ''
                ]);
                exportToWord('Phone_Call_Logs', headers, rows);
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
                  <th>NAME</th>
                  <th>PHONE</th>
                  <th>DATE</th>
                  <th>CALL DURATION</th>
                  <th>CALL TYPE</th>
                  <th>DESCRIPTION</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                  </tr>
                ) : filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '8px' }}>
                        <i className="fas fa-folder-open" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                      </div>
                      <div style={{ fontWeight: 600 }}>No data available in table</div>
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name || 'Unknown'}</td>
                      <td>{c.phone}</td>
                      <td>{new Date(c.date).toLocaleDateString()}</td>
                      <td>{c.callDuration || '-'}</td>
                      <td>
                        <span className={`status-badge ${c.callType === 'Incoming' ? 'status-paid' : 'status-unpaid'}`}>
                          {c.callType}
                        </span>
                      </td>
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
              <h2>Add Phone Call Log</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="portal-label">Name</label>
                  <input type="text" className="portal-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
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
                  <label className="portal-label">Next follow date</label>
                  <input type="date" className="portal-input" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="portal-label">Call duration</label>
                  <input type="text" className="portal-input" value={callDuration} onChange={e => setCallDuration(e.target.value)} placeholder="Call duration" />
                </div>
                <div className="form-group">
                  <label className="portal-label">Call type</label>
                  <select className="portal-input" value={callType} onChange={e => setCallType(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Incoming">Incoming</option>
                    <option value="Outgoing">Outgoing</option>
                  </select>
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
