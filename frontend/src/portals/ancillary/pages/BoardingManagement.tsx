import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import TabbedPage, { type TabItem } from '../../../components/portals/shared/TabbedPage';

export default function BoardingManagement() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [signOutData, setSignOutData] = useState({ studentId: '', type: 'SIGN_OUT', reason: '' });

  // Requisitions & Approvals state
  const [approvalsTab, setApprovalsTab] = useState<'STAFF' | 'STUDENT_LEADER'>('STUDENT_LEADER');
  const [studentLeaderRequests, setStudentLeaderRequests] = useState<any[]>([]);
  const [staffRequests, setStaffRequests] = useState<any[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedReqForDecline, setSelectedReqForDecline] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Matron Clinic Integration state
  const [boardersInSickBay, setBoardersInSickBay] = useState<any[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertData, setAlertData] = useState({ studentId: '', notes: '', acuity: 'YELLOW' });
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
    fetchRequisitions();
  }, []);

  const fetchData = async () => {
    try {
      const [hostelRes, studentRes, clinicRes] = await Promise.all([
        api.get('/api/ancillary/hostels'),
        api.get('/api/students'),
        api.get('/clinic/matron/boarders').catch(() => ({ data: [] }))
      ]);
      setHostels(hostelRes.data || []);
      setStudents(studentRes.data?.students || []);
      setBoardersInSickBay(clinicRes.data || []);
    } catch (err) {
      showToast('Failed to load boarding data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequisitions = async () => {
    try {
      setApprovalsLoading(true);
      const [studentReqsRes, staffReqsRes] = await Promise.all([
        api.get('/api/procurement/requisitions?requesterRole=STUDENT_LEADER'),
        api.get('/api/procurement/requisitions')
      ]);
      
      const allStudent = studentReqsRes.data || [];
      setStudentLeaderRequests(allStudent);

      const allStaff = (staffReqsRes.data || []).filter((r: any) => r.requesterRole !== 'STUDENT_LEADER');
      setStaffRequests(allStaff);
    } catch (err) {
      console.error('Failed to load requisitions', err);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const handleSignOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/ancillary/boarding/log', signOutData);
      showToast('Boarding log recorded', 'success');
      setIsSignOutModalOpen(false);
      setSignOutData({ studentId: '', type: 'SIGN_OUT', reason: '' });
    } catch (err) {
      showToast('Failed to record sign-out', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/procurement/requisitions/${id}/matron-approve`);
      showToast('Student cleaning supplies request approved and forwarded to Admin!', 'success');
      fetchRequisitions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const openDeclineModal = (req: any) => {
    setSelectedReqForDecline(req);
    setDeclineReason('');
    setDeclineModalOpen(true);
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForDecline) return;

    try {
      setProcessingId(selectedReqForDecline.id);
      await api.post(`/api/procurement/requisitions/${selectedReqForDecline.id}/matron-reject`, {
        reason: declineReason
      });
      showToast('Request declined and student notified.', 'info');
      setDeclineModalOpen(false);
      setSelectedReqForDecline(null);
      fetchRequisitions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to decline request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingStudentRequests = studentLeaderRequests.filter(r => r.status === 'PENDING_HOD_BOARDING');

  // --- TAB 1: Hostels & Occupancy ---
  const occupancyContent = (
    <div>
      <div className="portal-grid-3" style={{ marginBottom: 30 }}>
        <div className="portal-card" style={{ background: 'linear-gradient(135deg, var(--school-primary, #3182ce), #2c5282)', color: 'white' }}>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{hostels.length}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Active Hostels</p>
          </div>
        </div>
        <div className="portal-card" style={{ background: 'linear-gradient(135deg, #38a169, #276749)', color: 'white' }}>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{students.filter(s => s.boardingStatus === 'Boarder').length}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Total Boarders</p>
          </div>
        </div>
        <div className="portal-card" style={{ background: '#fff', border: '2px dashed #cbd5e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button 
            onClick={() => setIsSignOutModalOpen(true)}
            className="portal-btn-primary" 
            style={{ padding: '12px 24px' }}
          >
            <i className="fas fa-sign-out-alt" style={{ marginRight: 8 }}></i>Record Student Movement
          </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-hotel" style={{ marginRight: 10, color: 'var(--school-primary, #3182ce)' }}></i>Hostel Overview</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Type</th>
                  <th>Warden / Matron</th>
                  <th>Capacity</th>
                  <th>Occupancy</th>
                  <th>Rooms</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map(h => {
                  const currentOccupancy = h.rooms?.reduce((acc: number, r: any) => acc + (r._count?.students || 0), 0) || 0;
                  const isFull = currentOccupancy >= h.capacity;
                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td>
                        <span className={`portal-badge ${h.type === 'BOYS' ? 'info' : 'secondary'}`} style={{ background: h.type === 'BOYS' ? '#ebf8ff' : '#fff5f5', color: h.type === 'BOYS' ? '#2b6cb0' : '#c53030' }}>
                          {h.type}
                        </span>
                      </td>
                      <td>
                        {h.warden ? (
                          <span className="text-success"><i className="fas fa-user-check mr-1"></i> {h.warden.name}</span>
                        ) : (
                          <span className="text-warning" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-exclamation-triangle mr-1"></i> Unassigned
                          </span>
                        )}
                      </td>
                      <td>{h.capacity}</td>
                      <td>{currentOccupancy} students</td>
                      <td>{h.rooms?.length || 0} rooms</td>
                      <td>
                        <span className={`portal-badge ${isFull ? 'error' : 'success'}`}>
                          {isFull ? 'FULL' : 'AVAILABLE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // --- TAB 2: Supplies Approvals (with Sub-tab A and Sub-tab B) ---
  const approvalsContent = (
    <div className="portal-card">
      <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Boarding Supplies & Requisition Approvals</h2>
          <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>Review student leader cleaning requests and staff boarding requisitions.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`portal-btn ${approvalsTab === 'STUDENT_LEADER' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
            onClick={() => setApprovalsTab('STUDENT_LEADER')}
          >
            <i className="fas fa-soap mr-2"></i>
            Student Leader Requests
            {pendingStudentRequests.length > 0 && (
              <span className="badge bg-danger ml-2" style={{ marginLeft: 8, padding: '2px 8px', borderRadius: '12px' }}>
                {pendingStudentRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`portal-btn ${approvalsTab === 'STAFF' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
            onClick={() => setApprovalsTab('STAFF')}
          >
            <i className="fas fa-user-tie mr-2"></i>
            Staff Requests
          </button>
        </div>
      </div>

      <div className="portal-card-body p-0">
        {approvalsLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i>
            <p>Loading requisitions...</p>
          </div>
        ) : approvalsTab === 'STUDENT_LEADER' ? (
          // Sub-tab B: Student Leader Requests
          <div className="table-responsive">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Prefect / Leader</th>
                  <th>Hostel</th>
                  <th>Supplies Requested</th>
                  <th>Justification / Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentLeaderRequests.map(req => {
                  const isPending = req.status === 'PENDING_HOD_BOARDING';
                  return (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.requestedByStudent?.name || req.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                          Ref: {req.refNumber}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className="fas fa-hotel mr-1 text-primary"></i>
                          {req.hostelReq?.name || 'Hostel'}
                        </span>
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem' }}>
                          {Array.isArray(req.items) && req.items.map((i: any, idx: number) => (
                            <li key={idx}><strong>{i.quantity}x</strong> {i.name || i.itemName}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                          {req.description || '-'}
                        </span>
                      </td>
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${req.status === 'PENDING_HOD_BOARDING' ? 'bg-warning text-dark' : req.status === 'REJECTED' ? 'bg-danger text-white' : 'bg-info text-white'}`} style={{ padding: '4px 8px' }}>
                          {req.status === 'PENDING_HOD_BOARDING' ? 'Waiting Matron Approval' : req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="portal-btn-success btn-sm"
                              disabled={processingId === req.id}
                              onClick={() => handleApprove(req.id)}
                              title="Approve and forward to Admin"
                            >
                              <i className="fas fa-check mr-1"></i> Approve
                            </button>
                            <button
                              className="portal-btn-danger btn-sm"
                              disabled={processingId === req.id}
                              onClick={() => openDeclineModal(req)}
                              title="Decline request"
                            >
                              <i className="fas fa-times mr-1"></i> Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {studentLeaderRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>
                      <i className="fas fa-check-circle fa-2x mb-2 text-success d-block"></i>
                      No student leader cleaning requests currently pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // Sub-tab A: Staff Requests
          <div className="table-responsive">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Title</th>
                  <th>Requested By</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {staffRequests.map(req => (
                  <tr key={req.id}>
                    <td><strong>{req.refNumber}</strong></td>
                    <td>{req.title}</td>
                    <td>{req.requester?.name || 'Staff'}</td>
                    <td>{req.department?.name || 'Boarding'}</td>
                    <td>${req.estimatedAmount?.toFixed(2) || '0.00'}</td>
                    <td>
                      <span className="badge bg-secondary">{req.status}</span>
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {staffRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>
                      No staff boarding requisitions logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const handleSendClinicAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertData.studentId) return;
    try {
      setAlertSubmitting(true);
      await api.post('/clinic/matron/alert', alertData);
      showToast('Health alert transmitted to clinic staff immediately', 'success');
      setIsAlertModalOpen(false);
      setAlertData({ studentId: '', notes: '', acuity: 'YELLOW' });
      const res = await api.get('/clinic/matron/boarders').catch(() => ({ data: [] }));
      setBoardersInSickBay(res.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send alert', 'error');
    } finally {
      setAlertSubmitting(false);
    }
  };

  const clinicContent = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>Boarders in Sick Bay</h3>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '0.9rem' }}>
            Boarding students currently admitted or under clinical observation.
          </p>
        </div>
        <button
          onClick={() => setIsAlertModalOpen(true)}
          className="portal-btn-primary"
          style={{ background: '#e53e3e', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <i className="fas fa-bell"></i> Send Clinic Alert / Referral
        </button>
      </div>

      {boardersInSickBay.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
          <i className="fas fa-heartbeat" style={{ fontSize: '2.5rem', color: '#48bb78', marginBottom: 12 }}></i>
          <p style={{ fontWeight: 600 }}>All boarders are currently in their hostels.</p>
          <p style={{ fontSize: '0.85rem' }}>No boarding students are admitted to the sick bay.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Hostel / Bed</th>
                <th>Reason / Condition</th>
                <th>Diet / Special Needs</th>
                <th>Admitted At</th>
              </tr>
            </thead>
            <tbody>
              {boardersInSickBay.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td><strong>{item.studentName}</strong></td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {item.hostelName || 'Hostel'} — {item.bedNumber}
                    </span>
                  </td>
                  <td>{item.plainReason || 'Health consultation'}</td>
                  <td>
                    {item.dietNotes ? (
                      <span className="badge bg-warning text-dark">{item.dietNotes}</span>
                    ) : (
                      <span className="text-muted">Standard diet</span>
                    )}
                  </td>
                  <td>{new Date(item.admittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'occupancy', label: 'Hostel Occupancy & Welfare', icon: 'fas fa-hotel', content: occupancyContent },
    { 
      id: 'approvals', 
      label: 'Supplies Approvals', 
      icon: 'fas fa-tasks', 
      badge: pendingStudentRequests.length > 0 ? pendingStudentRequests.length : undefined, 
      content: approvalsContent 
    },
    { 
      id: 'clinic', 
      label: 'Sick Bay & Health', 
      icon: 'fas fa-heartbeat', 
      badge: boardersInSickBay.length > 0 ? boardersInSickBay.length : undefined, 
      content: clinicContent 
    }
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Boarding Management & Supplies</h1>
        <p>Hostel occupancy tracking, boarding welfare movements, and student leader supplies approval.</p>
      </div>

      <TabbedPage
        title="Boarding Administration"
        subtitle="Manage resident hostels and process cleaning supplies requisitions"
        tabs={tabs}
        defaultTab="occupancy"
      />

      {/* Movement Modal */}
      {isSignOutModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Record Student Movement</h2>
              <button onClick={() => setIsSignOutModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSignOut} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Select Student</label>
                <select 
                  className="form-control portal-input"
                  value={signOutData.studentId}
                  onChange={e => setSignOutData({...signOutData, studentId: e.target.value})}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Movement Type</label>
                <select 
                  className="form-control portal-input"
                  value={signOutData.type}
                  onChange={e => setSignOutData({...signOutData, type: e.target.value})}
                >
                  <option value="SIGN_OUT">Sign Out (Exiting School)</option>
                  <option value="SIGN_IN">Sign In (Returning)</option>
                  <option value="SICK_BAY">Moved to Sick Bay</option>
                  <option value="DISCIPLINE">Disciplinary Action</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Reason / Notes</label>
                <textarea 
                  className="form-control portal-input"
                  value={signOutData.reason}
                  onChange={e => setSignOutData({...signOutData, reason: e.target.value})}
                  rows={3}
                  placeholder="e.g. Weekend Pass, Hospital Visit, Returned from holiday"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsSignOutModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Record Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Decline Supplies Request</h2>
              <button onClick={() => setDeclineModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleDeclineSubmit} style={{ padding: 20 }}>
              <p style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: 12 }}>
                Please provide a constructive reason for declining the request from <strong>{selectedReqForDecline?.requestedByStudent?.name || 'Student Leader'}</strong>. The student will be able to see this reason.
              </p>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Decline Reason</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  required
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  placeholder="e.g. Current hostel stock sufficient for this week. Please re-apply next Tuesday."
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setDeclineModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-danger" disabled={processingId === selectedReqForDecline?.id}>
                  {processingId === selectedReqForDecline?.id ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matron Clinic Alert Modal */}
      {isAlertModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2><i className="fas fa-bell text-danger mr-2"></i>Send Matron Clinic Alert</h2>
              <button onClick={() => setIsAlertModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSendClinicAlert} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Unwell Boarding Student</label>
                <select
                  className="portal-input"
                  required
                  value={alertData.studentId}
                  onChange={e => setAlertData({ ...alertData, studentId: e.target.value })}
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Urgency / Acuity</label>
                <select
                  className="portal-input"
                  value={alertData.acuity}
                  onChange={e => setAlertData({ ...alertData, acuity: e.target.value })}
                >
                  <option value="YELLOW">Yellow (Elevated Temperature / Feeling Sick)</option>
                  <option value="RED">Red (Severe Pain / Injury / Respiratory Distress)</option>
                  <option value="GREEN">Green (Routine Review / Non-Urgent)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Observations & Symptoms</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  required
                  placeholder="e.g. Complained of intense stomach ache after lights out, vomiting twice..."
                  value={alertData.notes}
                  onChange={e => setAlertData({ ...alertData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsAlertModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#e53e3e' }} disabled={alertSubmitting}>
                  {alertSubmitting ? 'Transmitting...' : 'Send Alert to Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
