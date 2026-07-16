import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

interface PortfolioData {
  enrollments: Array<{
    school: { name: string; code: string; branding: any };
    studentId: string;
    class: string;
    status: string;
    enrollmentDate: string;
  }>;
  reports: Array<{
    id: string;
    schoolId: string;
    term: string;
    year: string;
    publishedStudent: boolean;
  }>;
  transferRequests: any[];
}

export default function AcademicPortfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTerminology();
  const { showToast } = useToast();

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/students/me/portfolio');
      setData(res.data);
    } catch (err) {
      console.error('Failed to synchronize global academic portfolio', err);
    
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleConsent = async (requestId: string) => {
    try {
      await api.post(`/api/transfers/${requestId}/consent`);
      showToast('Institutional access consent granted', 'success');
      fetchPortfolio();
    } catch (error) {
      showToast('Failed to authorize access consent', 'error');
    
    }
  };

  if (loading) return (
    <div className="portal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div className="portal-spinner"></div>
    </div>
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Global Academic Portfolio</h1>
          <p>Your unified learning history and institutional audits across all entities on the Acadex platform.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontWeight: 900 }}>
           <i className="fas fa-globe-africa mr-2"></i>UNIFIED REGISTRY
        </div>
      </div>

      <div className="portal-grid-3-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Enrollment Timeline */}
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <i className="fas fa-route fa-lg"></i>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Academic Journey</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Chronological history of institutional enrollments.</p>
              </div>
            </div>
            
            <div style={{ padding: '0 8px' }}>
              {(Array.isArray(data?.enrollments) ? data.enrollments : []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
                  <i className="fas fa-folder-open" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                  <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.1rem' }}>No Historical Records Identified</h3>
                  <p style={{ margin: 0, fontWeight: 600 }}>Your academic trajectory will be mapped here.</p>
                </div>
              ) : (
                <div className="portfolio-timeline" style={{ position: 'relative' }}>
                  {(Array.isArray(data?.enrollments) ? data.enrollments : []).map((en, index) => (
                    <div key={index} style={{ 
                        display: 'flex', 
                        gap: '32px', 
                        marginBottom: '40px', 
                        position: 'relative',
                        paddingBottom: '8px'
                    }}>
                      {index !== (data?.enrollments?.length || 0) - 1 && (
                        <div style={{ 
                          position: 'absolute', 
                          left: '9px', 
                          top: '28px', 
                          bottom: '-28px', 
                          width: '2px', 
                          background: '#f1f5f9' 
                        }}></div>
                      )}
                      <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          backgroundColor: '#2563eb', 
                          border: '5px solid #fff',
                          boxShadow: '0 0 0 1px #e2e8f0',
                          zIndex: 1,
                          marginTop: '8px'
                      }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>{en.school?.name}</h3>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 800 }}>
                                    <i className="fas fa-id-badge mr-1"></i> {t('student')} ID: <span style={{ color: '#1e293b' }}>{en.studentId}</span>
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800 }}>•</span>
                                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 800 }}>
                                    <i className="fas fa-calendar-alt mr-1"></i> Authorized: <span style={{ color: '#1e293b' }}>{new Date(en.enrollmentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                                </span>
                            </div>
                          </div>
                          <span className={`status-badge ${en.status?.toLowerCase().includes('enrolled') ? 'status-active' : 'status-pending'}`} style={{ fontWeight: 900, padding: '6px 16px', fontSize: '0.7rem' }}>
                            {en.status?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ padding: '24px', borderRadius: '20px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', gap: '48px' }}>
                             <div>
                               <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Institutional Grade</label>
                               <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{en.class}</span>
                             </div>
                             <div>
                               <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Registry Status</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: en.status?.toLowerCase().includes('enrolled') ? '#059669' : '#d97706' }}></div>
                                 <span style={{ fontWeight: 800, color: '#475569', fontSize: '0.9rem' }}>Official Record</span>
                               </div>
                             </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Historical Reports Cluster */}
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <i className="fas fa-file-invoice fa-lg"></i>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Legacy Academic Audits</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Authorized termly performance reports across institutions.</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {(Array.isArray(data?.reports) ? data.reports : []).filter(r => r.publishedStudent).map(report => (
                <div key={report.id} style={{ 
                  background: '#fff',
                  border: '1px solid #f1f5f9', 
                  borderRadius: '20px', 
                  padding: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '20px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
                className="hover-card"
                onClick={() => window.open(`/api/reports/download/${report.id}`, '_blank')}
                >
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                    <i className="fas fa-file-pdf fa-lg"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 900, margin: 0, fontSize: '1rem', color: '#1e293b' }}>{report.term} {report.year}</p>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Authorize Download</span>
                  </div>
                </div>
              ))}
              {(Array.isArray(data?.reports) ? data.reports : []).filter(r => r.publishedStudent).length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
                  <i className="fas fa-file-alt" style={{ fontSize: '3rem', color: '#94a3b8', opacity: 0.1, marginBottom: '16px', display: 'block' }}></i>
                  <p style={{ margin: 0, fontWeight: 800, color: '#94a3b8' }}>No published reports available in registry</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Transfer Control Center */}
          <div className="portal-card" style={{ borderTop: '4px solid #f59e0b' }}>
            <div className="portal-card-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <i className="fas fa-exchange-alt"></i>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>Transfer Audit</h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px', fontWeight: 700, lineHeight: 1.6 }}>
              Manage and authorize data visibility permissions for receiving institutions during academic transfers.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              {(Array.isArray(data?.transferRequests) ? data.transferRequests : []).map((req, i) => (
                <div key={i} style={{ 
                    padding: '20px', 
                    borderRadius: '20px', 
                    backgroundColor: req.status === 'APPROVED' ? '#ecfdf5' : '#fffbeb',
                    border: `1px solid ${req.status === 'APPROVED' ? '#d1fae5' : '#fef3c7'}`,
                    transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>{req.targetSchool?.name}</div>
                    <span className={`status-badge ${req.status === 'APPROVED' ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.65rem', fontWeight: 900, padding: '4px 10px' }}>
                      {req.status}
                    </span>
                  </div>
                  
                  {!req.studentConsent && req.status === 'PENDING' && (
                    <button 
                        onClick={() => handleConsent(req.id)}
                        className="portal-btn-primary" 
                        style={{ width: '100%', fontSize: '0.8rem', height: '44px', fontWeight: 900 }}
                    >
                        <i className="fas fa-shield-check mr-2"></i> Authorize Data Access
                    </button>
                  )}
                  
                  {req.studentConsent && req.status === 'PENDING' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d97706', padding: '12px', background: 'rgba(217, 119, 6, 0.05)', borderRadius: '12px' }}>
                      <i className="fas fa-clock fa-sm"></i>
                      <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>
                        Institutional Audit in Progress
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {(Array.isArray(data?.transferRequests) ? data.transferRequests : []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #e2e8f0' }}>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, fontWeight: 800 }}>
                        No active transfer requests identified
                    </p>
                </div>
              )}
            </div>

            <div style={{ 
                padding: '24px', 
                borderRadius: '20px', 
                backgroundColor: '#eff6ff', 
                border: '1px solid #dbeafe',
                position: 'relative',
                overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '4rem', opacity: 0.03, transform: 'rotate(-15deg)' }}>
                <i className="fas fa-shield-alt"></i>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <i className="fas fa-shield-check fa-xs"></i>
                </div>
                <p style={{ margin: 0, color: '#1e40af', fontWeight: 900, fontSize: '0.9rem' }}>Privacy Protocol</p>
              </div>
              <p style={{ margin: 0, color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.6 }}>
                  Global academic records are strictly immutable and only accessible upon multi-entity cryptographic authorization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
