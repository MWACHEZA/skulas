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

export default function ZoomLiveClass() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    classId: '',
    section: '',
    meetingId: '',
    meetingPassword: '',
    timeStart: '',
    timeEnd: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    remarks: '',
    sendSms: false
  });

  useEffect(() => {
    fetchClasses();
    fetchLiveClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Error fetching classes', error);
    
    }
  };

  const fetchLiveClasses = async () => {
    try {
      const res = await api.get('/api/live-class?platform=Zoom');
      setLiveClasses(res.data);
    } catch (error) {
      console.error('Error fetching live classes', error);
    
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.classId || !formData.meetingId || !formData.date || !formData.timeStart || !formData.timeEnd) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/live-class', {
        ...formData,
        platform: 'Zoom'
      });
      showToast('Zoom Live Class Created Successfully', 'success');
      fetchLiveClasses();
      setFormData({
        title: '', classId: '', section: '', meetingId: '', meetingPassword: '',
        timeStart: '', timeEnd: '', date: format(new Date(), 'yyyy-MM-dd'), remarks: '', sendSms: false
      });
      setShowModal(false);
    } catch (error) {
      showToast('Failed to create live class', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await api.delete(`/api/live-class/${id}`);
      showToast('Class deleted', 'success');
      fetchLiveClasses();
    } catch (error) {
      showToast('Failed to delete', 'error');
    
    }
  };

  const filteredLiveClasses = liveClasses.filter(lc => {
    const titleText = lc.title || '';
    const meetingIdText = lc.meetingId || '';
    const className = lc.class?.name || '';
    return titleText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meetingIdText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      className.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Zoom Live Class</h1>
          <p>Organize and coordinate virtual video lectures and live streaming classes.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus"></i> Create Live Class
        </button>
      </div>

      {showModal && (
        <div className="portal-modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: 20 }}>
          <div className="portal-modal-content" style={{ background: 'white', borderRadius: 16, maxWidth: 550, width: '100%', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button 
              onClick={() => setShowModal(false)} 
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-video mr-2" style={{ color: 'var(--portal-success)' }}></i> CREATE ZOOM LIVE CLASS
            </h2>
            
            <div className="portal-form-group">
              <label>Title <span style={{ color: 'red' }}>*</span></label>
              <input type="text" className="portal-input" placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div className="portal-form-group">
                <label>Class <span style={{ color: 'red' }}>*</span></label>
                <select className="portal-input" value={formData.classId} onChange={e => setFormData({ ...formData, classId: e.target.value })}>
                  <option value="">Select</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="portal-form-group">
                <label>Section <span style={{ color: 'red' }}>*</span></label>
                <select className="portal-input" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}>
                  <option value="">Select Class First</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div className="portal-form-group">
                <label>Zoom Meeting Id <span style={{ color: 'red' }}>*</span></label>
                <input type="text" className="portal-input" placeholder="Zoom Meeting Id" value={formData.meetingId} onChange={e => setFormData({ ...formData, meetingId: e.target.value })} />
              </div>
              <div className="portal-form-group">
                <label>Meeting password <span style={{ color: 'red' }}>*</span></label>
                <input type="text" className="portal-input" placeholder="Meeting password" value={formData.meetingPassword} onChange={e => setFormData({ ...formData, meetingPassword: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div className="portal-form-group">
                <label>Time Start <span style={{ color: 'red' }}>*</span></label>
                <input type="time" className="portal-input" value={formData.timeStart} onChange={e => setFormData({ ...formData, timeStart: e.target.value })} />
              </div>
              <div className="portal-form-group">
                <label>Time End <span style={{ color: 'red' }}>*</span></label>
                <input type="time" className="portal-input" value={formData.timeEnd} onChange={e => setFormData({ ...formData, timeEnd: e.target.value })} />
              </div>
            </div>

            <div className="portal-form-group">
              <label>Date <span style={{ color: 'red' }}>*</span></label>
              <input type="date" className="portal-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>

            <div className="portal-form-group">
              <label>Remarks</label>
              <textarea className="portal-input" rows={2} placeholder="please specify meeting remarks here" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })}></textarea>
            </div>

            <div className="portal-form-group">
              <label>Send Notification SMS</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#4a5568' }}>
                <input type="checkbox" checked={formData.sendSms} onChange={e => setFormData({ ...formData, sendSms: e.target.checked })} />
                <span>Send Notification SMS<br/>Meeting will not be sent to mobile number(s)!</span>
              </div>
            </div>

            <button className="portal-btn-primary" style={{ width: '100%', background: 'var(--portal-success)', borderColor: 'var(--portal-success)', marginTop: 10 }} onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="portal-card" style={{ borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-list mr-2"></i>LIVE CLASSES
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Title', 'Meeting ID', 'Class', 'Section', 'Date', 'Start Time', 'End Time', 'Created By'];
                const rows = filteredLiveClasses.map(lc => [
                  lc.title,
                  lc.meetingId,
                  lc.class?.name || '',
                  lc.section,
                  format(new Date(lc.date), 'dd/MM/yyyy'),
                  lc.timeStart,
                  lc.timeEnd,
                  lc.teacher?.name || ''
                ]);
                exportToCSV('Zoom_Live_Classes', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Title', 'Meeting ID', 'Class', 'Section', 'Date', 'Start Time', 'End Time', 'Created By'];
                const rows = filteredLiveClasses.map(lc => [
                  lc.title,
                  lc.meetingId,
                  lc.class?.name || '',
                  lc.section,
                  format(new Date(lc.date), 'dd/MM/yyyy'),
                  lc.timeStart,
                  lc.timeEnd,
                  lc.teacher?.name || ''
                ]);
                exportToWord('Zoom_Live_Classes', headers, rows);
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
                <th>TITLE</th>
                <th>MEETING ID</th>
                <th>CLASS</th>
                <th>SECTION</th>
                <th>DATE</th>
                <th>START TIME</th>
                <th>END TIME</th>
                <th>CREATED BY</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveClasses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: '#a0aec0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b', opacity: 0.5, marginBottom: 10 }}></i>
                    <span>No entries found</span>
                  </div>
                </td></tr>
              ) : (
                filteredLiveClasses.map(lc => (
                  <tr key={lc.id}>
                    <td>{lc.title}</td>
                    <td>{lc.meetingId}</td>
                    <td>{lc.class?.name}</td>
                    <td>{lc.section}</td>
                    <td>{format(new Date(lc.date), 'dd/MM/yyyy')}</td>
                    <td>{lc.timeStart}</td>
                    <td>{lc.timeEnd}</td>
                    <td>{lc.teacher?.name}</td>
                    <td>
                      <button className="portal-btn-secondary" style={{ padding: '2px 6px', color: 'var(--portal-danger)', border: 'none' }} onClick={() => handleDelete(lc.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '0.9rem' }}>
             <span>Showing 1 to {filteredLiveClasses.length} of {filteredLiveClasses.length} entries</span>
             <div>
                <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginRight: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
                <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginLeft: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
