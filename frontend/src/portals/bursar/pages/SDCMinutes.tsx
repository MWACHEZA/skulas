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

export default function BursarSDCMinutes() {
  const { t } = useTerminology();
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);

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
        <p>Bursar's record of {t('governance')} decisions with financial implications.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-file-invoice" style={{ marginRight: 8, color: 'var(--school-primary, #0056b3)' }}></i>Governance Archive</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Meeting Date</th>
                <th>Title / Agenda</th>
                <th>Status</th>
                <th>Attachments</th>
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
                  <td>{m.title}</td>
                  <td>
                    <span className={`portal-badge ${m.status === 'Approved' ? 'success' : m.status === 'Archived' ? 'neutral' : 'info'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.documentUrl ? (
                      <span>
                        <i className="fas fa-file-pdf" style={{ marginRight: 6, color: 'var(--portal-danger)' }}></i>
                        {m.title.replace(/\s+/g, '_')}_Minutes.pdf
                      </span>
                    ) : (
                      <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>No Attachment</span>
                    )}
                  </td>
                  <td>
                    {m.documentUrl ? (
                      <button 
                        className="portal-btn-secondary" 
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDownloadFile(m.documentUrl!, `${m.title.replace(/\s+/g, '_')}_Minutes.pdf`)}
                      >
                        Download
                      </button>
                    ) : (
                      <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
