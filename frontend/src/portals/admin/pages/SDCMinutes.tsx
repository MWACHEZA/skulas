import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';

interface MeetingMinute {
  id: string;
  date: string;
  title: string;
  attendees: string;
  status: string;
  documentUrl: string | null;
}

export default function AdminSDCMinutes() {
  const { t } = useTerminology();
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form states
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState('');
  const [status, setStatus] = useState('Draft');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/meeting-minutes');
      setMeetings(res.data);
    } catch (err) {
      console.error('Failed to fetch meeting minutes', err);
    
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title) return;
    setSubmitting(true);
    
    const formData = new FormData();
    formData.append('date', date);
    formData.append('title', title);
    formData.append('attendees', attendees);
    formData.append('status', status);
    if (file) {
      formData.append('file', file);
    }

    try {
      await api.post('/api/meeting-minutes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Meeting minutes uploaded successfully!');
      setShowModal(false);
      setDate('');
      setTitle('');
      setAttendees('');
      setStatus('Draft');
      setFile(null);
      fetchMinutes();
    } catch (err) {
      console.error('Failed to upload minutes', err);
      alert('Failed to upload minutes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting minutes record?')) return;
    try {
      await api.delete(`/api/meeting-minutes/${id}`);
      fetchMinutes();
    } catch (err) {
      console.error('Failed to delete meeting minutes', err);
    
    }
  };

  const handleDownloadFile = async (documentUrl: string, fileName: string) => {
    try {
      const response = await api.get(`/api/storage/file/${documentUrl}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'minutes.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file', error);
      alert('Failed to download file');
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>{t('governanceShort')} Meeting Minutes</h1>
        <p>Official records and documentation of the {t('governance')} meetings.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-file-signature" style={{ marginRight: 8, color: 'var(--school-primary, #0056b3)' }}></i>Minutes Archive</h2>
          <button 
            className="portal-btn-primary" 
            style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }}
            onClick={() => setShowModal(true)}
          >
            + Upload Minutes
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Meeting Title</th>
                <th>Attendees</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Loading minutes...</td></tr>
              ) : meetings.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>No meeting minutes found.</td></tr>
              ) : meetings.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{new Date(m.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{m.title}</td>
                  <td>{m.attendees || 'N/A'}</td>
                  <td>
                    <span className={`portal-badge ${m.status === 'Approved' ? 'success' : m.status === 'Archived' ? 'neutral' : 'info'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {m.documentUrl && (
                        <button 
                          className="portal-btn-secondary" 
                          style={{ padding: '6px 12px' }}
                          onClick={() => handleDownloadFile(m.documentUrl!, `${m.title.replace(/\s+/g, '_')}_Minutes.pdf`)}
                        >
                          <i className="fas fa-eye"></i> View
                        </button>
                      )}
                      <button 
                        className="portal-btn-secondary" 
                        style={{ padding: '6px 12px', color: 'var(--portal-danger)' }}
                        onClick={() => handleDelete(m.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Upload Meeting Minutes</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Store official records of {t('governanceShort')} meetings.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Meeting Date <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="date" 
                    required 
                    className="portal-input" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Meeting Title <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="portal-input" 
                    placeholder="e.g. Infrastructure Planning"
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Attendees</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Board Members, Registrar"
                    value={attendees} 
                    onChange={e => setAttendees(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Status</label>
                  <select 
                    className="portal-input" 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Approved">Approved</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Upload Document (PDF)</label>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    className="portal-input" 
                    onChange={e => setFile(e.target.files?.[0] || null)} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} disabled={submitting}>
                    {submitting ? 'Uploading...' : 'Upload Minutes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
