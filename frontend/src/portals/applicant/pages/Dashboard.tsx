import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';

export default function ApplicantDashboard() {
  const { t, isMedical } = useTerminology();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/dashboard/applicant');
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch applicant dashboard:', err);
    
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 50, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)' }}></i>
      <p style={{ marginTop: 15, color: '#718096' }}>Updating your status...</p>
    </div>
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Welcome, {data?.applicantName?.split(' ')[0] || t('applicant')}!</h1>
        <p>Your journey with Skulas starts here. Track your <strong>{data?.appType || t('admission')}</strong> application progress below.</p>
      </div>

      <div className="portal-grid-3">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-tasks"></i></div>
          <div className="portal-stat-info">
            <h3>{data?.progress || 0}%</h3>
            <p>Application Progress</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="portal-stat-info">
            <h3>{data?.documents?.verified || 0}/{data?.documents?.total || 0}</h3>
            <p>Documents Verified</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon yellow"><i className="fas fa-flag"></i></div>
          <div className="portal-stat-info">
            <h3 style={{ textTransform: 'capitalize' }}>{data?.status || 'Pending'}</h3>
            <p>Current Status</p>
          </div>
        </div>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className={`fas ${isMedical ? 'fa-notes-medical' : 'fa-stream'}`} style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Event Timeline</h2>
          </div>
          <div className="portal-card-body">
            <div className="timeline-container" style={{ position: 'relative', paddingLeft: '30px' }}>
              {data?.timeline?.length > 0 ? data.timeline.map((item: any, index: number) => (
                <div key={index} style={{ marginBottom: '24px', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: '-37px', 
                    top: '2px', 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: 'var(--school-primary, #3182ce)',
                    border: '3px solid white',
                    boxShadow: '0 0 0 1px #cbd5e0',
                    zIndex: 2
                  }}></div>
                  {index < data.timeline.length - 1 && (
                    <div style={{ 
                      position: 'absolute', 
                      left: '-31px', 
                      top: '16px', 
                      width: '2px', 
                      height: '32px', 
                      background: '#e2e8f0',
                      zIndex: 1
                    }}></div>
                  )}
                  <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#2d3748' }}>{item.event}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>
                    {new Date(item.occurredAt).toLocaleDateString()} - {item.description}
                  </p>
                </div>
              )) : (
                <p style={{ color: '#a0aec0' }}>No timeline events recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Next Steps</h2>
          </div>
          <div className="portal-card-body">
            {data?.status === 'pending' ? (
              <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', color: '#2b6cb0' }}>Awaiting Review</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#2c5282' }}>
                  Your application is currently being reviewed by our admissions team. Please ensure all documents are uploaded.
                </p>
              </div>
            ) : data?.status === 'accepted' ? (
              <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', color: '#276749' }}>Action Required</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#2f855a' }}>
                  Congratulations! Your application was successful. Please visit the 'Fees' section to pay your {t('admission')} deposit.
                </p>
              </div>
            ) : (
              <p style={{ color: '#718096' }}>Check back later for updates on your next steps.</p>
            )}
            <button className="portal-btn-primary" style={{ width: '100%' }} onClick={() => window.location.href = '/applicant/documents'}>
              Manage Documents
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
