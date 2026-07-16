import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';

export default function TrackApplication() {
  const [appId, setAppId] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setSchoolCode(codeUpper);
      localStorage.setItem('last_school_code', codeUpper);
    }
  }, []);

  const handleSchoolCodeChange = (val: string) => {
    setSchoolCode(val);
    if (val.trim()) {
      localStorage.setItem('last_school_code', val.toUpperCase());
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setApplication(null);
    try {
      const { data } = await api.get(`/api/auth/application-status/${appId}`, {
        params: { schoolCode }
      });
      setApplication(data);
      showToast('Application record found!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Application not found. Please check your ID and School Code.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container" style={{ maxWidth: 500 }}>
        <div className="register-header" style={{ background: '#334155' }}>
          <i className="fas fa-search-location" style={{ fontSize: '2.5rem', marginBottom: 15 }}></i>
          <h2>Track Application</h2>
          <p>Check the status of your entrance application</p>
        </div>

        <div className="form-body">
          <form onSubmit={handleTrack}>
            <div className="form-group">
              <label>Application ID *</label>
              <input type="text" placeholder="e.g. cluyx..." value={appId} onChange={e => setAppId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>School Access Code *</label>
              <input type="text" placeholder="e.g. AX-DEMO" value={schoolCode} onChange={e => handleSchoolCodeChange(e.target.value)} required />
            </div>
            <button type="submit" className="btn-next" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
              {loading ? 'Searching...' : 'Track Application Status'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 20, padding: 15, background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: '0.9rem' }}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {application && (
            <div style={{ marginTop: 30, padding: 20, background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h4 style={{ margin: 0, color: '#0369a1' }}>Submission Details</h4>
                <span style={{ 
                  background: application.status === 'pending' ? '#fde68a' : application.status === 'accepted' ? '#6ee7b7' : '#fca5a5',
                  padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                }}>
                  {application.status}
                </span>
              </div>
              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}><strong>Applicant:</strong> {application.applicantName}</p>
              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}><strong>Type:</strong> {application.type}</p>

              <div style={{ marginTop: 20 }}>
                <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>Application Timeline</h5>
                <div style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: 15 }}>
                  {application.timeline.map((event: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: 15, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-21px', top: '5px', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }}></div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{event.event}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{new Date(event.occurredAt).toLocaleDateString()}</p>
                      {event.description && <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#475569' }}>{event.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="register-footer">
          <Link to={schoolCode ? `/school/${schoolCode.trim().toUpperCase()}` : "/"}><i className="fas fa-home"></i> Back to Home</Link> &nbsp;|&nbsp; <Link to={schoolCode ? `/apply?school=${schoolCode.trim().toUpperCase()}` : "/apply"}>New Application</Link>
        </div>
      </div>
    </div>
  );
}
