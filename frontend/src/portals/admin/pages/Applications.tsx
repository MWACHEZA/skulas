import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

export default function AdminApplications() {
  const [activeTab, setActiveTab] = useState('all');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interview Fields
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [intDate, setIntDate] = useState('');
  const [intTime, setIntTime] = useState('');
  const [intVenue, setIntVenue] = useState('');

  const { user } = useAuth();
  const { t, isUniversity } = useTerminology();
  const { showToast } = useToast();

  const isAuthorizedToApprove = user?.role === 'SCHOOL_ADMIN' || 
    user?.secondaryRoles?.includes('Senior Teacher') || 
    user?.secondaryRoles?.includes('Class Teacher');

  useEffect(() => {
    fetchApplications();
    fetchClasses();
  }, [activeTab]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/reports/classes');
      setClasses(data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/applications', {
        params: { status: activeTab }
      });
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, extraData: any = {}) => {
    if (newStatus === 'accepted' && !selectedClassId) {
      alert('Please select a class for this student before approving.');
      return;
    }

    if (newStatus === 'interview' && (!intDate || !intVenue)) {
      alert('Please provide interview date and venue.');
      return;
    }

    const confirmMsg = newStatus === 'accepted' ? 'approve this application and enroll the student' : `mark this application as ${newStatus}`;
    if (!(await toastConfirm(`Are you sure you want to ${confirmMsg}?`))) return;

    setUpdating(true);
    try {
      await api.patch(`/api/applications/${id}`, { 
        status: newStatus,
        classId: newStatus === 'accepted' ? selectedClassId : undefined,
        ...extraData
      });
      fetchApplications();
      setSelectedApp(null);
      setSelectedClassId('');
      setShowInterviewForm(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const renderAcademicHistory = () => {
    if (isUniversity && selectedApp.academicData) {
      const d = selectedApp.academicData;
      return (
        <div style={{ marginBottom: 25 }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096', display: 'block', marginBottom: 10 }}>University Academic Profile</label>
          
          <div style={{ background: '#f8fafc', padding: 15, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--school-primary)' }}>O-Level Record</p>
              {Array.isArray(d.oLevels) && d.oLevels.map((o: any, i: number) => (
                  <div key={i} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>{o.subject}</span>
                    <span style={{ fontWeight: 700 }}>{o.grade}</span>
                  </div>
                ))}
              </div>
              {selectedApp.entryCategory === 'Normal' && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--school-primary)' }}>A-Level Record</p>
                  {Array.isArray(d.aLevels) && d.aLevels.map((a: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>{a.subject}</span>
                      <span style={{ fontWeight: 700 }}>{a.grade}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedApp.eligibility && (
            <div style={{ marginTop: 15, padding: 12, borderRadius: 8, background: selectedApp.eligibility.eligible ? '#f0fff4' : '#fff5f5', border: `1px solid ${selectedApp.eligibility.eligible ? '#c6f6d5' : '#fed7d7'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <i className={`fas fa-${selectedApp.eligibility.eligible ? 'check-circle' : 'exclamation-triangle'}`} style={{ color: selectedApp.eligibility.eligible ? 'var(--portal-success)' : 'var(--portal-danger)' }}></i>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Requirement Verification</span>
              </div>
              {selectedApp.eligibility.reasons.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: '#c53030' }}>
                  {(Array.isArray(selectedApp.eligibility.reasons) ? selectedApp.eligibility.reasons : []).map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#2f855a' }}>Candidate meets minimum entry requirements.</p>
              )}
              {selectedApp.eligibility.flags.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  {(Array.isArray(selectedApp.eligibility.flags) ? selectedApp.eligibility.flags : []).map((f: string, idx: number) => (
                    <p key={idx} style={{ fontSize: '0.7rem', color: '#718096', margin: 0 }}>ℹ️ {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    if (!selectedApp.academicHistory) return null;

    if (selectedApp.appType === 'Form 1') {
      const h = selectedApp.academicHistory;
      return (
        <div style={{ marginBottom: 25 }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096' }}>Entrance Results (Units)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 8 }}>
            {[
              { label: 'Maths', val: h.maths },
              { label: 'English', val: h.english },
              { label: 'General', val: h.general },
              { label: 'Language', val: h.language }
            ].map(s => (
              <div key={s.label} style={{ background: '#f0f4f8', padding: '10px 5px', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#718096', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2d3748' }}>{s.val || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (typeof selectedApp.academicHistory === 'string') {
      return (
        <div style={{ marginBottom: 25 }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096' }}>Prior Qualifications</label>
          <p style={{ fontSize: '0.9rem', color: '#2d3748', background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 5, whiteSpace: 'pre-wrap' }}>
            {selectedApp.academicHistory}
          </p>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 25 }}>
        <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096' }}>Academic Performance</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {Array.isArray(selectedApp.academicHistory) && selectedApp.academicHistory.map((h: any, i: number) => (
            <div key={i} style={{ background: '#edf2f7', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem' }}>
              <strong>{h.subject}:</strong> {h.grade}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'review': return 'info';
      case 'interview': return 'purple';
      case 'accepted': return 'success';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const handleVerifyDoc = async (docId: string, status: string) => {
    try {
      await api.patch(`/api/applications/documents/${docId}`, { status });
      // Refresh the selected application to show updated doc status
      const { data } = await api.get(`/api/applications/${selectedApp.id}`);
      setSelectedApp(data);
      showToast(`Document ${status} successfully`, 'success');
    } catch (err) {
      alert('Failed to update document status');
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Admissions & Applications</h1>
        <p>Review and process new {t('student')} enrollment applications.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'pending', 'review', 'interview', 'accepted', 'rejected'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
            style={{ 
              padding: '8px 20px', 
              background: activeTab === tab ? 'var(--portal-primary)' : 'white', 
              color: activeTab === tab ? 'white' : '#4a5568', 
              border: '1px solid #cbd5e0', 
              borderRadius: 20, 
              cursor: 'pointer', 
              fontWeight: 600,
              textTransform: 'capitalize',
              fontSize: '0.85rem'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 400 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }}></i>
          <input
            type="text"
            className="portal-input"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <>
            <table className="portal-table">
              <thead>
                <tr><th>App ID</th><th>{t('applicant')} Name</th><th>Type</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {(() => {
                  const apps = (Array.isArray(applications) ? applications : []).filter(a => 
                    a.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = apps.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && apps.length > 0) setCurrentPage(1);
                  return apps.length > 0 ? currentItems.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: '#2d3748', fontWeight: 600, fontSize: '0.85rem' }}>{a.applicationNumber || a.id.substring(0, 8)}</td>
                    <td style={{ fontWeight: 600 }}>{a.applicantName}</td>
                    <td>{isUniversity ? a.entryCategory || 'N/A' : a.appType}</td>
                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span className={`portal-badge ${getStatusBadge(a.status)}`}>
                          {a.status}
                        </span>
                        {isUniversity && a.eligibility && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            color: a.eligibility.eligible ? 'var(--portal-success)' : 'var(--portal-danger)',
                            fontWeight: 700
                          }}>
                            {a.eligibility.eligible ? '✓ Criteria Met' : '⚠ Below Requirements'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                        <button 
                          className="portal-btn-ghost" 
                          title="Review Application"
                          style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => {
                            setSelectedApp(a);
                            setSelectedClassId(a.assignedClassId || '');
                          }}
                        >
                          <i className="fas fa-eye" style={{ color: '#4338ca' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#a0aec0' }}>No applications found.</td></tr>
                );
                })()}
              </tbody>
            </table>
            {(() => {
              const apps = (Array.isArray(applications) ? applications : []).filter(a => 
                a.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              return apps.length > 0 && !loading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, apps.length)} of {apps.length} entries
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(apps.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(apps.length / itemsPerPage) || apps.length === 0}
                    className="portal-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            );
            })()}
            </>
          )}
        </div>
      </div>

      {selectedApp && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 700 }}>
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0 }}>Application Review</h2>
                <span className={`portal-badge ${getStatusBadge(selectedApp.status)}`}>{selectedApp.status}</span>
              </div>
              <button className="portal-modal-close" onClick={() => { setSelectedApp(null); setShowInterviewForm(false); }}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096' }}>Name & Contacts</label>
                  <p style={{ fontWeight: 600, margin: '2px 0' }}>{selectedApp.applicantName}</p>
                  <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#4a5568' }}>{selectedApp.email}<br/>{selectedApp.phone}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096' }}>Tracking Info</label>
                  <p style={{ margin: '2px 0' }}><strong>ID:</strong> {selectedApp.applicationNumber || selectedApp.id}</p>
                  <p style={{ margin: '2px 0' }}><strong>{isUniversity ? 'Entry Category' : 'Type'}:</strong> {isUniversity ? selectedApp.entryCategory : selectedApp.appType}</p>
                </div>
              </div>

              {selectedApp.status === 'interview' && (selectedApp.interviewDate || intDate) && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#6d28d9', marginBottom: 10 }}><i className="fas fa-calendar-alt"></i> Scheduled Interview</h4>
                  <p style={{ margin: '2px 0', fontSize: '0.9rem' }}>
                    <strong>Date:</strong> {selectedApp.interviewDate ? new Date(selectedApp.interviewDate).toLocaleDateString() : intDate}<br/>
                    <strong>Time:</strong> {selectedApp.interviewTime || intTime || 'N/A'}<br/>
                    <strong>Venue:</strong> {selectedApp.interviewVenue || intVenue}
                  </p>
                </div>
              )}

              {selectedApp.appType === 'Transfer' && (
                <div style={{ background: '#fffaf0', border: '1px solid #feebc8', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#9c4221', margin: 0 }}><i className="fas fa-exchange-alt"></i> Transfer Information</h4>
                    <button 
                      onClick={async () => {
                        try {
                          const schoolCode = prompt("Enter previous school's Acadex Code (if known):", "");
                          if (!schoolCode) return;
                          await api.post('/api/transfers/request', {
                            studentEmail: selectedApp.email,
                            originSchoolCode: schoolCode,
                            targetSchoolCode: user?.schoolCode // We need the code
                          });
                          showToast('Transfer request initiated. Waiting for student and origin school consent.', 'success');
                        } catch (err: any) {
                          showToast(err.response?.data?.error || 'Failed to initiate transfer', 'error');
                        
    }
                      }}
                      className="portal-btn-link" 
                      style={{ fontSize: '0.75rem', padding: 0 }}
                    >
                      <i className="fas fa-search"></i> Request Acadex Records
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#7b341e' }}>Previous School</label>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedApp.prevSchool || 'N/A'}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#7b341e' }}>Last Grade</label>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedApp.lastGradeAchieved || 'N/A'}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#718096', marginTop: 10, fontStyle: 'italic' }}>
                    Note: Official records will only appear in the student's portfolio after triple-party consent is granted.
                  </p>
                </div>
              )}

              {renderAcademicHistory()}

              {/* Categorized Documentation Review */}
              {selectedApp.documents && selectedApp.documents.length > 0 && (() => {
                const isMedical = selectedApp.appType?.toLowerCase().includes('nursing') || selectedApp.school?.type?.toLowerCase().includes('nursing');
                
                const categories = [
                  { title: 'Identity & Personal Records', types: ['Birth Certificate', 'National ID', 'Passport', 'Guardian ID'] },
                  { title: isMedical ? 'Academic & Registration History' : 'Academic Records', types: ['Academic Certificate', 'O-Level Results', 'A-Level Results', 'Transcripts', 'School Leaving Cert'] },
                  { title: 'Professional & Clinical Records', types: ['Medical Fitness Cert', 'Nursing Council Indexing', 'Police Clearance', 'Immunization Record'], hidden: !isMedical }
                ];

                return (
                  <div style={{ marginBottom: 25 }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#718096', display: 'block', marginBottom: 15 }}>Documentation Verification</label>
                    
                    {categories.filter(c => !c.hidden).map((cat, catIdx) => {
                      const catDocs = selectedApp.documents.filter((d: any) => cat.types.includes(d.name));
                      if (catDocs.length === 0) return null;

                      return (
                        <div key={catIdx} style={{ marginBottom: 20 }}>
                          <h5 style={{ fontSize: '0.8rem', color: '#4a5568', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                             <i className="fas fa-folder-open" style={{ color: 'var(--school-primary, #3182ce)' }}></i> {cat.title}
                          </h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 10 }}>
                            {catDocs.map((doc: any) => (
                              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f7fafc', padding: '10px 15px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <i className={`fas ${doc.url.endsWith('pdf') ? 'fa-file-pdf' : 'fa-file-image'}`} style={{ color: doc.url.endsWith('pdf') ? 'var(--portal-danger)' : 'var(--school-primary, #3182ce)', fontSize: '1.1rem' }}></i>
                                  <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{doc.name}</p>
                                    <span className={`portal-badge ${doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'danger' : 'info'}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                                      {doc.status}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <a href={`${BASE_URL}/api/storage/media/${doc.url}`} target="_blank" rel="noreferrer" className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.7rem', textDecoration: 'none' }}>
                                    View
                                  </a>
                                  {isAuthorizedToApprove && doc.status === 'pending' && (
                                    <>
                                      <button onClick={() => handleVerifyDoc(doc.id, 'verified')} style={{ background: 'var(--portal-success)', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem' }}>Verify</button>
                                      <button onClick={() => handleVerifyDoc(doc.id, 'rejected')} style={{ background: 'var(--portal-danger)', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem' }}>Reject</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Show uncategorized/custom documents */}
                    {(() => {
                      const otherDocs = selectedApp.documents.filter((d: any) => !categories.some(c => c.types.includes(d.name)));
                      if (otherDocs.length === 0) return null;
                      return (
                        <div style={{ marginTop: 15 }}>
                          <h5 style={{ fontSize: '0.8rem', color: '#4a5568', margin: '0 0 10px' }}>Other Supporting Files</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 10 }}>
                            {otherDocs.map((doc: any) => (
                              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f7fafc', padding: '8px 12px', borderRadius: 8, border: '1px dotted #cbd5e0' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{doc.name}</span>
                                <a href={`${BASE_URL}/api/storage/media/${doc.url}`} target="_blank" rel="noreferrer" className="portal-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', textDecoration: 'none' }}>View</a>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Decision Section */}
              {isAuthorizedToApprove && (
                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                  {showInterviewForm ? (
                    <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <h4 style={{ marginBottom: 15 }}>Schedule Entrance Interview</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="form-group">
                          <label>Date *</label>
                          <input type="date" value={intDate} onChange={e => setIntDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Time</label>
                          <input type="time" value={intTime} onChange={e => setIntTime(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label>Venue / Link *</label>
                          <input type="text" placeholder="e.g. Principal's Office or Zoom Link" value={intVenue} onChange={e => setIntVenue(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <button className="portal-btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateStatus(selectedApp.id, 'interview', { interviewDate: intDate, interviewTime: intTime, interviewVenue: intVenue })}>Confirm Schedule</button>
                        <button className="portal-btn-secondary" style={{ flex: 1 }} onClick={() => setShowInterviewForm(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {['pending', 'review'].includes(selectedApp.status) && (
                        <button className="portal-btn-secondary" style={{ gridColumn: 'span 2', background: '#ebf4ff', color: 'var(--school-primary, #3182ce)', border: '1px solid #bee3f8' }} 
                          onClick={() => handleUpdateStatus(selectedApp.id, 'review')}>
                          <i className="fas fa-search" style={{ marginRight: 8 }}></i> Move to Review
                        </button>
                      )}
                      
                      {['pending', 'review'].includes(selectedApp.status) && (
                        <button className="portal-btn-secondary" style={{ gridColumn: 'span 2', background: '#faf5ff', color: '#6b46c1', border: '1px solid #e9d8fd' }} 
                          onClick={() => setShowInterviewForm(true)}>
                          <i className="fas fa-calendar-alt" style={{ marginRight: 8 }}></i> Schedule Interview
                        </button>
                      )}

                      {selectedApp.status !== 'accepted' && (
                        <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d3748', display: 'block', marginBottom: 5 }}>ENROLL INTO CLASS</label>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <select style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e0' }} value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                              <option value="">-- Choose Class --</option>
                              {(Array.isArray(classes) ? classes : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button className="portal-btn-primary" style={{ flex: 1, background: 'var(--portal-success)' }} onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')}>Approve & Enroll</button>
                          </div>
                        </div>
                      )}

                      {selectedApp.status !== 'rejected' && (
                        <button className="portal-btn-secondary" style={{ gridColumn: 'span 2', marginTop: 5, color: 'var(--portal-danger)' }} onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}>
                          Reject Application
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
