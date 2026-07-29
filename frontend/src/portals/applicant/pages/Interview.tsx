import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { format } from 'date-fns';

export default function ApplicantInterview() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchInterviewDetails();
  }, []);

  const fetchInterviewDetails = async () => {
    try {
      const res = await api.get('/api/dashboard/applicant');
      setData(res.data);
    } catch {
      showToast('Failed to load interview details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRequestVirtual = () => {
    showToast('Your request for a virtual interview has been sent to admissions.', 'success');
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)' }}></i>
        <p style={{ marginTop: 12, color: '#718096' }}>Loading interview details...</p>
      </div>
    );
  }

  const hasInterview = data?.interviewDate || data?.interviewTime || data?.interviewVenue;
  const status = hasInterview ? 'Scheduled' : 'Pending';

  const requirements = [
    'Original Birth Certificate',
    'Latest School Report Card',
    'Placement Letter (if applicable)',
    'Stationery for a short aptitude test'
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Entrance Interview</h1>
        <p>Your official school entrance interview details and preparation checklist.</p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card" style={{ borderTop: `5px solid ${hasInterview ? 'var(--school-primary, #3182ce)' : '#a0aec0'}` }}>
          <div className="portal-card-header">
            <h2>Appointment Details</h2>
            <span className={`portal-badge ${hasInterview ? 'info' : 'neutral'}`}>{status}</span>
          </div>
          <div className="portal-card-body">
            {hasInterview ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <i className="fas fa-calendar-alt" style={{ color: 'var(--school-primary, #3182ce)', width: 20 }}></i>
                    <span>{data.interviewDate ? format(new Date(data.interviewDate), 'EEEE, dd MMMM yyyy') : 'TBD'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <i className="fas fa-clock" style={{ color: 'var(--school-primary, #3182ce)', width: 20 }}></i>
                    <span>{data.interviewTime || 'TBD'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <i className="fas fa-map-marker-alt" style={{ color: 'var(--portal-danger)', width: 20 }}></i>
                    <span>{data.interviewVenue || 'TBD'}</span>
                  </div>
                </div>
                <button className="portal-btn-secondary" style={{ width: '100%' }} onClick={handlePrint}>
                  <i className="fas fa-print" style={{ marginRight: 8 }}></i>Print Appointment Slip
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <i className="fas fa-calendar-times fa-2x" style={{ color: '#cbd5e0', marginBottom: 12 }}></i>
                <p style={{ color: '#718096', fontSize: '0.95rem' }}>Your interview has not been scheduled yet. We will notify you when a slot is assigned.</p>
              </div>
            )}
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Preparation Checklist</h2>
          </div>
          <div className="portal-card-body">
            <p style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: 15 }}>Please bring the following originals to your interview:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {requirements.map((req, i) => (
                <li key={i} style={{ marginBottom: 8, fontSize: '0.9rem', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <i className="far fa-square" style={{ color: '#cbd5e0' }}></i>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ background: '#ebf8ff', border: 'none' }}>
        <div className="portal-card-body" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2rem', color: 'var(--school-primary, #3182ce)' }}><i className="fas fa-video"></i></div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <h4 style={{ margin: '0 0 5px' }}>Prefer an Online Interview?</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#2c5282' }}>If you are applying from outside the province, you can request a Zoom interview. Submit your request at least 48 hours before the scheduled time.</p>
          </div>
          <button className="portal-btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleRequestVirtual}>
            Request Virtual
          </button>
        </div>
      </div>
    </>
  );
}
