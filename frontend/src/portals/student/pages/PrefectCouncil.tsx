import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface DutyAssignment {
  id: string;
  prefectName: string;
  zone: string;
  timeSlot: string;
  day: string;
}

interface MeetingMinutes {
  id: string;
  title: string;
  date: string;
  chair: string;
  recordsText: string;
}

interface ConductReport {
  id: string;
  studentName: string;
  category: string;
  narrative: string;
  createdAt: string;
  reportedBy?: {
    name: string;
    role: string;
  };
}

export default function PrefectCouncil() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'roster' | 'meetings' | 'reports'>('roster');

  // Dynamic Lists
  const [duties, setDuties] = useState<DutyAssignment[]>([]);
  const [meetings, setMeetings] = useState<MeetingMinutes[]>([]);
  const [reports, setReports] = useState<ConductReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state for Duties
  const [dutiesPage, setDutiesPage] = useState(1);
  const itemsPerPage = 10;
  const totalDutyPages = Math.ceil(duties.length / itemsPerPage);
  const paginatedDuties = duties.slice((dutiesPage - 1) * itemsPerPage, dutiesPage * itemsPerPage);

  // Modals
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Forms
  const [dutyForm, setDutyForm] = useState({
    prefectName: '',
    zone: '',
    timeSlot: '',
    day: 'Monday'
  });

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    chair: '',
    recordsText: ''
  });

  const [reportForm, setReportForm] = useState({
    studentName: '',
    category: 'Uniform Violation',
    narrative: ''
  });

  // School Type Awareness
  const type = (user?.schoolType || 'Secondary').toLowerCase();
  const isTertiary = type.includes('nursing') || type.includes('medical') || type.includes('college') ||
                     type.includes('poly') || type.includes('technical') || type.includes('vocational') ||
                     type.includes('university') || type.includes('varsity') || type.includes('tertiary') ||
                     type.includes('combined');

  const pageTitle = isTertiary ? 'Student Representative Council (SRC)' : 'Prefects Board';
  const pageSubtitle = isTertiary 
    ? 'Represent. Coordinate. Advocate. Bridging the student body and school senate.' 
    : 'Lead. Monitor. Record. Ensuring the standards of school excellence.';

  const rosterLabel = isTertiary ? 'Council Roster' : 'Duty Roster';
  const reportsLabel = isTertiary ? 'Student Concerns' : 'Conduct Reports';
  const oathText = isTertiary
    ? 'Representative Oath: "I solemnly declare that this report is filed in good faith to represent and maintain the integrity of the student body."'
    : 'Council Oath: "I solemnly declare that this report is truthful and filed without personal bias, for the integrity of the school code."';

  // Role Checks
  const isPrefectLeader = user?.secondaryRoles?.includes('Head Boy') || 
                          user?.secondaryRoles?.includes('Head Girl') || 
                          user?.secondaryRoles?.includes('Vice Head Boy') || 
                          user?.secondaryRoles?.includes('Vice Head Girl') || 
                          user?.secondaryRoles?.includes('Senior Prefect') ||
                          user?.secondaryRoles?.includes('Senior Teacher') ||
                          user?.role === 'SCHOOL_ADMIN';

  const canViewReportsLog = user?.role === 'SCHOOL_ADMIN' || 
                            user?.secondaryRoles?.includes('Senior Teacher');

  const canFileReports = user?.role === 'SCHOOL_ADMIN' || 
                         user?.secondaryRoles?.includes('Prefect') ||
                         user?.secondaryRoles?.includes('Head Boy') || 
                         user?.secondaryRoles?.includes('Head Girl') || 
                         user?.secondaryRoles?.includes('Vice Head Boy') || 
                         user?.secondaryRoles?.includes('Vice Head Girl') || 
                         user?.secondaryRoles?.includes('Senior Prefect') ||
                         user?.secondaryRoles?.includes('Class Monitor') ||
                         user?.secondaryRoles?.includes('Student Librarian');

  // Styles & Branding
  const primaryColor = 'var(--portal-primary, #1e3a8a)'; // System Standard
  const accentColor = 'var(--portal-accent, #f59e0b)'; // System Standard

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'roster') {
        const res = await api.get('/api/prefects/duties');
        setDuties(res.data);
      } else if (activeTab === 'meetings') {
        const res = await api.get('/api/prefects/meetings');
        setMeetings(res.data);
      } else if (activeTab === 'reports' && canViewReportsLog) {
        const res = await api.get('/api/prefects/reports');
        setReports(res.data);
      }
    } catch (error) {
      showToast(`Failed to load ${activeTab} data`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDutySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/prefects/duties', dutyForm);
      showToast('Duty assignment scheduled successfully', 'success');
      setShowDutyModal(false);
      setDutyForm({ prefectName: '', zone: '', timeSlot: '', day: 'Monday' });
      fetchData();
    } catch (error) {
      showToast('Failed to schedule duty', 'error');
    
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/prefects/meetings', meetingForm);
      showToast('Meeting minutes published successfully', 'success');
      setShowMeetingModal(false);
      setMeetingForm({ title: '', date: '', chair: '', recordsText: '' });
      fetchData();
    } catch (error) {
      showToast('Failed to publish minutes', 'error');
    
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/prefects/reports', reportForm);
      showToast('Conduct report filed successfully', 'success');
      setShowReportModal(false);
      setReportForm({ studentName: '', category: 'Uniform Violation', narrative: '' });
      if (canViewReportsLog) fetchData();
    } catch (error) {
      showToast('Failed to file conduct report', 'error');
    
    }
  };

  return (
    <div className="prefect-portal-container" style={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${primaryColor}08 0%, ${accentColor}08 100%)`, 
      padding: '30px' 
    }}>
      {/* Header */}
      <div className="portal-page-header" style={{
        background: `linear-gradient(135deg, ${primaryColor}1A 0%, ${accentColor}1A 100%)`,
        borderLeft: `6px solid ${primaryColor}`,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '40px'
      }}>
        <h1 style={{ color: primaryColor, fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>{pageTitle}</h1>
        <p style={{ color: '#475569', fontSize: '1.1rem', marginTop: '8px', fontWeight: 500 }}>{pageSubtitle}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 30, background: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 16, width: 'max-content', flexWrap: 'wrap' }}>
        {[
          { id: 'roster', icon: 'fa-clipboard-list', label: rosterLabel },
          { id: 'meetings', icon: 'fa-handshake', label: 'Meeting Minutes' },
          { id: 'reports', icon: 'fa-file-invoice', label: reportsLabel }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{ 
              padding: '12px 24px', 
              borderRadius: '12px', 
              border: 'none', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === tab.id ? primaryColor : 'transparent',
              color: activeTab === tab.id ? 'white' : '#486581',
              boxShadow: activeTab === tab.id ? `0 4px 14px ${primaryColor}4D` : 'none'
            }}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="portal-card" style={{ 
        background: 'white', 
        borderRadius: '24px', 
        border: 'none', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: primaryColor }}></i>
            <p style={{ marginTop: '16px', color: '#64748b' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* ROSTER TAB */}
            {activeTab === 'roster' && (
              <div style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
                  <h2 style={{ color: '#1e293b', margin: 0, fontWeight: 800 }}>Weekly Duty Assignments</h2>
                  {isPrefectLeader && (
                    <button 
                      onClick={() => setShowDutyModal(true)}
                      className="portal-btn-primary" 
                      style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus-circle"></i> ADD DUTY SLOT
                    </button>
                  )}
                </div>
                
                <div className="management-table-card" style={{ boxShadow: 'none', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                  <div className="table-responsive">
                    <table className="management-table">
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th>Prefect / Member</th>
                          <th>Zone / Area</th>
                          <th>Timeline</th>
                          <th>Day</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDuties.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No duty assignments scheduled yet.</td>
                          </tr>
                        ) : (
                          paginatedDuties.map(duty => (
                            <tr key={duty.id} style={{ background: 'white' }}>
                              <td style={{ fontWeight: 800, color: '#1e293b' }}>{duty.prefectName}</td>
                              <td><span className="status-badge" style={{ background: `${primaryColor}15`, color: primaryColor }}>{duty.zone}</span></td>
                              <td style={{ fontWeight: 700, color: '#475569' }}>{duty.timeSlot}</td>
                              <td><span className="status-badge status-active">{duty.day}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    
                    {duties.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Showing {(dutiesPage - 1) * itemsPerPage + 1} to {Math.min(dutiesPage * itemsPerPage, duties.length)} of {duties.length} entries
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setDutiesPage(prev => Math.max(prev - 1, 1))}
                            disabled={dutiesPage === 1}
                            className="portal-btn-ghost"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            Previous
                          </button>
                          <button 
                            onClick={() => setDutiesPage(prev => Math.min(prev + 1, totalDutyPages))}
                            disabled={dutiesPage === totalDutyPages || duties.length === 0}
                            className="portal-btn-ghost"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MEETINGS TAB */}
            {activeTab === 'meetings' && (
              <div style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
                  <h2 style={{ color: '#1e293b', margin: 0, fontWeight: 800 }}>Council Proceedings</h2>
                  {isPrefectLeader && (
                    <button 
                      onClick={() => setShowMeetingModal(true)}
                      className="portal-btn-primary" 
                      style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus-circle"></i> NEW MINUTES
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      No meeting minutes recorded yet.
                    </div>
                  ) : (
                    meetings.map(m => (
                      <div key={m.id} style={{ 
                        padding: '24px', 
                        background: '#f8fafc', 
                        borderRadius: '20px',
                        border: '1px solid #cbd5e120'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: '10px' }}>
                          <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>{m.title}</h4>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}><i className="fas fa-calendar mr-1"></i> {new Date(m.date).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: primaryColor, fontWeight: 700, marginBottom: '12px' }}>
                          <i className="fas fa-user-tie mr-1"></i> Chair: {m.chair}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }}>
                          {m.recordsText}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <div style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
                  <h2 style={{ color: '#1e293b', margin: 0, fontWeight: 800 }}>{isTertiary ? 'Student Concern & Disciplinary Registry' : 'Conduct Violation Logs'}</h2>
                  {canFileReports && (
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="portal-btn-primary" 
                      style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus-circle"></i> {isTertiary ? 'LOG INCIDENT' : 'FILE CONDUCT REPORT'}
                    </button>
                  )}
                </div>

                {canViewReportsLog ? (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {reports.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        No conduct reports logged.
                      </div>
                    ) : (
                      reports.map(report => (
                        <div key={report.id} style={{ 
                          padding: '24px', 
                          border: '1px solid #f1f5f9', 
                          borderRadius: '20px',
                          background: '#f8fafc' 
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginRight: '10px' }}>
                                Student: {report.studentName}
                              </span>
                              <span className="status-badge" style={{ background: `${accentColor}1A`, color: accentColor }}>
                                {report.category}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                              {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
                            "{report.narrative}"
                          </p>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                            <i className="fas fa-user-tie mr-1"></i> Reported by: {report.reportedBy?.name} ({report.reportedBy?.role})
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '20px' }}>
                    <i className="fas fa-lock fa-2x" style={{ color: '#94a3b8', marginBottom: '15px' }}></i>
                    <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>Only Admins and Senior Teachers can access conduct logs.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* POPUP MODALS */}

      {/* Add Duty Assignment Modal */}
      {showDutyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '95%', maxWidth: '500px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 800 }}>Schedule Council Assignment</h3>
            <form onSubmit={handleDutySubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Member / Prefect Name</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={dutyForm.prefectName} onChange={e => setDutyForm({ ...dutyForm, prefectName: e.target.value })}
                    placeholder="e.g. Sarah Dube"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Duty Zone / Area</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={dutyForm.zone} onChange={e => setDutyForm({ ...dutyForm, zone: e.target.value })}
                    placeholder="e.g. Dining Hall, West Wing"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Time Slot</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={dutyForm.timeSlot} onChange={e => setDutyForm({ ...dutyForm, timeSlot: e.target.value })}
                    placeholder="e.g. 12:30 - 13:30"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Day of Week</label>
                  <select 
                    className="portal-select w-full"
                    value={dutyForm.day} onChange={e => setDutyForm({ ...dutyForm, day: e.target.value })}
                  >
                    <option>Monday</option>
                    <option>Tuesday</option>
                    <option>Wednesday</option>
                    <option>Thursday</option>
                    <option>Friday</option>
                    <option>Saturday</option>
                    <option>Sunday</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowDutyModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Save Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Minutes Modal */}
      {showMeetingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '95%', maxWidth: '550px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 800 }}>Record Council Minutes</h3>
            <form onSubmit={handleMeetingSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Session Title</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={meetingForm.title} onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    placeholder="e.g. Standard Review Committee"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Date</label>
                    <input 
                      type="date" className="portal-input w-full" required
                      value={meetingForm.date} onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Chairperson</label>
                    <input 
                      type="text" className="portal-input w-full" required
                      value={meetingForm.chair} onChange={e => setMeetingForm({ ...meetingForm, chair: e.target.value })}
                      placeholder="e.g. Head Boy"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Session Summary & Resolutions</label>
                  <textarea 
                    className="portal-input w-full" rows={5} required
                    value={meetingForm.recordsText} onChange={e => setMeetingForm({ ...meetingForm, recordsText: e.target.value })}
                    placeholder="Describe session details..."
                  ></textarea>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowMeetingModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Publish Minutes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Conduct Report Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '95%', maxWidth: '500px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>{isTertiary ? 'Log Incident' : 'File Conduct Incident'}</h3>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, color: '#4a5568', marginBottom: '8px' }}>Target Student</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={reportForm.studentName} onChange={e => setReportForm({ ...reportForm, studentName: e.target.value })}
                    placeholder="Search by name or ID..."
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, color: '#4a5568', marginBottom: '8px' }}>Incident Category</label>
                  <select 
                    className="portal-select w-full"
                    value={reportForm.category} onChange={e => setReportForm({ ...reportForm, category: e.target.value })}
                  >
                    <option>Uniform Violation</option>
                    <option>Lateness (Classes/Assembly)</option>
                    <option>Insolence / Disrespect</option>
                    <option>Prohibited Zone Access</option>
                    <option>Vandalism / Littering</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, color: '#4a5568', marginBottom: '8px' }}>Observed Narrative</label>
                  <textarea 
                    className="portal-input w-full" rows={4} required
                    value={reportForm.narrative} onChange={e => setReportForm({ ...reportForm, narrative: e.target.value })}
                    placeholder="Provide a clinical, objective description of the event..."
                  ></textarea>
                </div>
              </div>

              <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '12px', display: 'flex', gap: '12px', margin: '20px 0' }}>
                <i className="fas fa-gavel" style={{ color: primaryColor, fontSize: '1.2rem', marginTop: '2px' }}></i>
                <p style={{ margin: 0, color: '#243b53', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  <strong>{isTertiary ? 'Oath of Office' : 'Council Oath'}:</strong> {oathText.split(': ')[1]}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowReportModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
