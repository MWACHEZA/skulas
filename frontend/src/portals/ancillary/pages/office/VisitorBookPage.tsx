import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { useTerminology } from '../../../../hooks/useTerminology';
import '../../../../styles/portal.css';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  idCard: string | null;
  numOfPerson: number;
  meetingWith: string | null;
  purpose: string;
  entryTime: string;
  note: string | null;
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

export default function VisitorBookPage() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [numOfPerson, setNumOfPerson] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [meetingWith, setMeetingWith] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/reception/visitors');
      setVisitors(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load visitors', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/reception/visitors', {
        name,
        phone,
        idCard,
        numOfPerson: parseInt(numOfPerson) || 1,
        purpose,
        meetingWith,
        entryTime: entryTime ? new Date(entryTime) : undefined,
        note
      });
      showToast('Visitor added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchVisitors();
    } catch (error) {
      showToast('Failed to add visitor', 'error');
    
    }
  };

  const resetForm = () => {
    setName(''); setPhone(''); setIdCard(''); setNumOfPerson('1');
    setPurpose(''); setMeetingWith(''); setEntryTime(''); setNote('');
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this visitor log?'))) return;
    try {
      await api.delete(`/api/reception/visitors/${id}`);
      showToast('Visitor log deleted successfully', 'success');
      fetchVisitors();
    } catch (error) {
      showToast('Failed to delete visitor log', 'error');
    
    }
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.meetingWith?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-content">
          <h1>Visitor Book</h1>
          <p>Record and monitor institutional visitors, parents, and vendors.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          onClick={() => setShowModal(true)} 
          style={{ background: 'var(--school-primary, #0056b3)', border: 'none' }}
        >
          <i className="fas fa-plus mr-2"></i>Add Visitor
        </button>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Visitor Registry</h2>
        </div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button 
              className="portal-btn-secondary" 
              onClick={() => {
                const headers = ['Purpose', 'Meeting With', 'Visitor Name', 'Phone', 'Date', 'ID Card', 'Time'];
                const rows = filteredVisitors.map(v => [
                  v.purpose,
                  v.meetingWith || '',
                  v.name,
                  v.phone,
                  new Date(v.entryTime).toLocaleDateString(),
                  v.idCard || '',
                  new Date(v.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                ]);
                exportToCSV('Visitor_Book', headers, rows);
              }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              className="portal-btn-secondary" 
              onClick={() => {
                const headers = ['Purpose', 'Meeting With', 'Visitor Name', 'Phone', 'Date', 'ID Card', 'Time'];
                const rows = filteredVisitors.map(v => [
                  v.purpose,
                  v.meetingWith || '',
                  v.name,
                  v.phone,
                  new Date(v.entryTime).toLocaleDateString(),
                  v.idCard || '',
                  new Date(v.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                ]);
                exportToWord('Visitor_Book', headers, rows);
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
                  <th>PURPOSE</th>
                  <th>MEETING WITH</th>
                  <th>VISITOR NAME</th>
                  <th>PHONE</th>
                  <th>DATE</th>
                  <th>IDCARD</th>
                  <th>TIME</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                  </tr>
                ) : filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '8px' }}>
                        <i className="fas fa-folder-open" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                      </div>
                      <div style={{ fontWeight: 600 }}>No data available in table</div>
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map(v => (
                    <tr key={v.id}>
                      <td>{v.purpose}</td>
                      <td>{v.meetingWith || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{v.name}</td>
                      <td>{v.phone}</td>
                      <td>{new Date(v.entryTime).toLocaleDateString()}</td>
                      <td>{v.idCard || '-'}</td>
                      <td>{new Date(v.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDelete(v.id)}
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
              <h2>Add Visitor</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="portal-label">Visitor name <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name" required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Phone <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Id card</label>
                  <input type="text" className="portal-input" value={idCard} onChange={e => setIdCard(e.target.value)} placeholder="Id card" />
                </div>
                <div className="form-group">
                  <label className="portal-label">Number of person</label>
                  <input type="number" className="portal-input" value={numOfPerson} onChange={e => setNumOfPerson(e.target.value)} placeholder="Number of person" min="1" />
                </div>
                <div className="form-group">
                  <label className="portal-label">Date <span style={{color:'red'}}>*</span></label>
                  <input type="date" className="portal-input" value={entryTime} onChange={e => setEntryTime(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Purpose <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={purpose} onChange={e => setPurpose(e.target.value)} required>
                    <option value="">Select purpose</option>
                    <option value="Official">Official</option>
                    <option value="Personal">Personal</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Meeting with</label>
                  <select className="portal-input" value={meetingWith} onChange={e => setMeetingWith(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Principal">Principal</option>
                    <option value="Admin">Admin</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Student">{t('student')}</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Note</label>
                  <input type="text" className="portal-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Note" />
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
