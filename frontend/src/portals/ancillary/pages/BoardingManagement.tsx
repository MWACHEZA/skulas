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

  // Boarding Movement & Exeat logs state
  const [boardingLogs, setBoardingLogs] = useState<any[]>([]);
  const [exeatFilter, setExeatFilter] = useState<'ALL' | 'ACTIVE'>('ACTIVE');
  const [returningLogId, setReturningLogId] = useState<string | null>(null);

  // Roll Call state
  const [rollCallHostelId, setRollCallHostelId] = useState<string>('ALL');
  const [rollCallSession, setRollCallSession] = useState<'MORNING' | 'EVENING' | 'LIGHTS_OUT'>('EVENING');
  const [rollCallDate, setRollCallDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentRollStatuses, setStudentRollStatuses] = useState<Record<string, 'PRESENT' | 'SICK_BAY' | 'EXEAT' | 'ABSENT'>>({});

  // Meal Deduction Modal state
  const [isMealDeductionModalOpen, setIsMealDeductionModalOpen] = useState(false);
  const [mealDeductionData, setMealDeductionData] = useState({
    mealType: 'DINNER',
    costPerMeal: 1.5,
    actualServedCount: 0,
    notes: ''
  });
  const [isPostingDeduction, setIsPostingDeduction] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
    fetchRequisitions();
  }, []);

  const fetchBoardingLogs = async () => {
    try {
      const res = await api.get('/api/ancillary/boarding/logs');
      setBoardingLogs(res.data || []);
    } catch (e) {
      console.error('Failed to refresh boarding logs', e);
    }
  };

  const fetchData = async () => {
    try {
      const [hostelRes, studentRes, clinicRes, logsRes] = await Promise.all([
        api.get('/api/ancillary/hostels'),
        api.get('/api/students'),
        api.get('/clinic/matron/boarders').catch(() => ({ data: [] })),
        api.get('/api/ancillary/boarding/logs').catch(() => ({ data: [] }))
      ]);
      setHostels(hostelRes.data || []);
      setStudents(studentRes.data?.students || []);
      setBoardersInSickBay(clinicRes.data || []);
      setBoardingLogs(logsRes.data || []);
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
      showToast('Boarding movement recorded successfully', 'success');
      setIsSignOutModalOpen(false);
      setSignOutData({ studentId: '', type: 'SIGN_OUT', reason: '' });
      fetchBoardingLogs();
    } catch (err) {
      showToast('Failed to record movement', 'error');
    }
  };

  const handleMarkReturned = async (logId: string) => {
    try {
      setReturningLogId(logId);
      await api.patch(`/api/ancillary/boarding/logs/${logId}/return`);
      showToast('Student marked as returned to hostel', 'success');
      fetchBoardingLogs();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update return status', 'error');
    } finally {
      setReturningLogId(null);
    }
  };

  const handlePostMealDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPostingDeduction(true);
      const res = await api.post('/api/dining-hall/meal-deduction', {
        mealType: mealDeductionData.mealType,
        date: rollCallDate,
        rollCallCount: rollCallSummary.present,
        actualServedCount: mealDeductionData.actualServedCount,
        costPerMeal: mealDeductionData.costPerMeal,
        notes: mealDeductionData.notes
      });
      showToast(`Meal deduction posted! Journal Entry #${res.data.entryNumber || 'posted'} (Variance: ${res.data.variance > 0 ? '+' : ''}${res.data.variance})`, 'success');
      setIsMealDeductionModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to post meal deduction to ledger', 'error');
    } finally {
      setIsPostingDeduction(false);
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

  // Filtered boarders for roll call based on selected hostel
  const boarderStudents = students.filter(s => s.boardingStatus === 'Boarder' || s.hostelId);
  const rollCallStudents = rollCallHostelId === 'ALL'
    ? boarderStudents
    : boarderStudents.filter(s => s.hostelId === rollCallHostelId);

  // Compute roll call counts
  const rollCallSummary = rollCallStudents.reduce((acc, s) => {
    const status = studentRollStatuses[s.id] || 'PRESENT';
    if (status === 'PRESENT') acc.present++;
    else if (status === 'SICK_BAY') acc.sickBay++;
    else if (status === 'EXEAT') acc.exeat++;
    else if (status === 'ABSENT') acc.absent++;
    return acc;
  }, { present: 0, sickBay: 0, exeat: 0, absent: 0 });

  const activeExeats = boardingLogs.filter(l => l.type === 'SIGN_OUT' && !l.returnedAt);

  const handleMarkAllPresent = () => {
    const newStatuses = { ...studentRollStatuses };
    rollCallStudents.forEach(s => {
      // Don't override if student is already in sick bay or on known exeat
      const current = newStatuses[s.id];
      if (current !== 'SICK_BAY' && current !== 'EXEAT') {
        newStatuses[s.id] = 'PRESENT';
      }
    });
    setStudentRollStatuses(newStatuses);
    showToast(`Marked ${rollCallStudents.length} boarders present for this session`, 'info');
  };

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

  // --- TAB: Dorm Roll Call ---
  const rollCallContent = (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', color: '#4a5568' }}>Hostel</label>
            <select
              className="portal-input"
              value={rollCallHostelId}
              onChange={e => setRollCallHostelId(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="ALL">All Hostels ({boarderStudents.length})</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', color: '#4a5568' }}>Session</label>
            <select
              className="portal-input"
              value={rollCallSession}
              onChange={e => setRollCallSession(e.target.value as any)}
              style={{ minWidth: 150 }}
            >
              <option value="MORNING">Morning Check</option>
              <option value="EVENING">Evening Roll Call</option>
              <option value="LIGHTS_OUT">Lights Out / Night Inspection</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', color: '#4a5568' }}>Date</label>
            <input
              type="date"
              className="portal-input"
              value={rollCallDate}
              onChange={e => setRollCallDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleMarkAllPresent}
            className="portal-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-check-double text-success"></i> Mark All Present
          </button>
          <button
            onClick={() => {
              setMealDeductionData(prev => ({
                ...prev,
                actualServedCount: rollCallSummary.present
              }));
              setIsMealDeductionModalOpen(true);
            }}
            className="portal-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-utensils"></i> Sync Dining Meal Deduction
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="portal-grid-4" style={{ marginBottom: 20 }}>
        <div className="portal-card" style={{ background: '#f0fff4', border: '1px solid #c6f6d5', padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#276749', fontWeight: 600 }}>Present in Dorms</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#22543d' }}>{rollCallSummary.present}</div>
          <div style={{ fontSize: '0.75rem', color: '#38a169' }}>Headcount present</div>
        </div>
        <div className="portal-card" style={{ background: '#fffaf0', border: '1px solid #feebc8', padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#9c4221', fontWeight: 600 }}>In Sick Bay</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#7b341e' }}>{rollCallSummary.sickBay}</div>
          <div style={{ fontSize: '0.75rem', color: '#dd6b20' }}>Under observation</div>
        </div>
        <div className="portal-card" style={{ background: '#ebf8ff', border: '1px solid #bee3f8', padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#2b6cb0', fontWeight: 600 }}>On Approved Exeat</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2c5282' }}>{rollCallSummary.exeat}</div>
          <div style={{ fontSize: '0.75rem', color: '#3182ce' }}>Outside campus</div>
        </div>
        <div className="portal-card" style={{ background: '#fff5f5', border: '1px solid #fed7d7', padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#9b2c2c', fontWeight: 600 }}>Unaccounted / Absent</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#742a2a' }}>{rollCallSummary.absent}</div>
          <div style={{ fontSize: '0.75rem', color: '#e53e3e' }}>Requires check</div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            <i className="fas fa-list-ol mr-2" style={{ color: 'var(--school-primary, #3182ce)' }}></i>
            Boarder Roll Call Roster ({rollCallStudents.length} Students)
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#718096' }}>
            Session: <strong>{rollCallSession}</strong> | Date: <strong>{rollCallDate}</strong>
          </span>
        </div>
        <div className="table-responsive">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission #</th>
                <th>Hostel / Dorm</th>
                <th>Status</th>
                <th>Action / Quick Toggle</th>
              </tr>
            </thead>
            <tbody>
              {rollCallStudents.map(student => {
                const currentStatus = studentRollStatuses[student.id] || 'PRESENT';
                return (
                  <tr key={student.id}>
                    <td><strong>{student.name}</strong></td>
                    <td><code style={{ fontSize: '0.85rem' }}>{student.studentId}</code></td>
                    <td>{student.hostel?.name || 'Assigned Boarder'}</td>
                    <td>
                      <span className={`portal-badge ${
                        currentStatus === 'PRESENT' ? 'success' :
                        currentStatus === 'SICK_BAY' ? 'warning' :
                        currentStatus === 'EXEAT' ? 'info' : 'error'
                      }`}>
                        {currentStatus === 'PRESENT' ? 'Present' :
                         currentStatus === 'SICK_BAY' ? 'Sick Bay' :
                         currentStatus === 'EXEAT' ? 'Exeat' : 'Unaccounted'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className={`portal-btn-sm ${currentStatus === 'PRESENT' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'PRESENT' })}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`portal-btn-sm ${currentStatus === 'SICK_BAY' ? 'portal-btn-warning' : 'portal-btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'SICK_BAY' })}
                        >
                          Sick Bay
                        </button>
                        <button
                          type="button"
                          className={`portal-btn-sm ${currentStatus === 'EXEAT' ? 'portal-btn-info' : 'portal-btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'EXEAT' })}
                        >
                          Exeat
                        </button>
                        <button
                          type="button"
                          className={`portal-btn-sm ${currentStatus === 'ABSENT' ? 'portal-btn-danger' : 'portal-btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          onClick={() => setStudentRollStatuses({ ...studentRollStatuses, [student.id]: 'ABSENT' })}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rollCallStudents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                    No boarders found for the selected hostel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- TAB: Exeat & Movements ---
  const displayedLogs = exeatFilter === 'ACTIVE'
    ? boardingLogs.filter(l => l.type === 'SIGN_OUT' && !l.returnedAt)
    : boardingLogs;

  const exeatContent = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>Exeat & Student Movements Register</h3>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '0.9rem' }}>
            Gate pass authorization, sign-out tracking, and real-time campus departure status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid #cbd5e0', borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setExeatFilter('ACTIVE')}
              className={`portal-btn-sm ${exeatFilter === 'ACTIVE' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
            >
              Active Exeats ({activeExeats.length})
            </button>
            <button
              onClick={() => setExeatFilter('ALL')}
              className={`portal-btn-sm ${exeatFilter === 'ALL' ? 'portal-btn-primary' : 'portal-btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
            >
              Full History ({boardingLogs.length})
            </button>
          </div>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="portal-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-sign-out-alt"></i> Issue Exeat / Movement Pass
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Hostel</th>
              <th>Movement Type</th>
              <th>Reason / Destination</th>
              <th>Departed At</th>
              <th>Return Status</th>
              <th>Authorized By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log: any) => {
              const isReturned = !!log.returnedAt;
              return (
                <tr key={log.id}>
                  <td><strong>{log.student?.name || 'Student'}</strong></td>
                  <td>{log.student?.hostel?.name || 'Boarder'}</td>
                  <td>
                    <span className={`portal-badge ${
                      log.type === 'SIGN_OUT' ? 'warning' :
                      log.type === 'SIGN_IN' ? 'success' :
                      log.type === 'SICK_BAY' ? 'info' : 'secondary'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td>{log.reason || 'No reason provided'}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>
                    {isReturned ? (
                      <span className="portal-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-check-circle"></i> Returned ({new Date(log.returnedAt).toLocaleTimeString()})
                      </span>
                    ) : (
                      <span className="portal-badge error" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-clock"></i> Outside Campus
                      </span>
                    )}
                  </td>
                  <td>{log.authorizedBy?.name || 'Staff'}</td>
                  <td>
                    {!isReturned && log.type === 'SIGN_OUT' ? (
                      <button
                        onClick={() => handleMarkReturned(log.id)}
                        disabled={returningLogId === log.id}
                        className="portal-btn-secondary portal-btn-sm text-success"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <i className="fas fa-check"></i>
                        {returningLogId === log.id ? 'Updating...' : 'Mark Returned'}
                      </button>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>Closed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {displayedLogs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                  {exeatFilter === 'ACTIVE'
                    ? 'No students currently outside campus on exeat.'
                    : 'No movement logs found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'occupancy', label: 'Hostel Occupancy & Welfare', icon: 'fas fa-hotel', content: occupancyContent },
    { 
      id: 'rollcall', 
      label: 'Dorm Roll Call', 
      icon: 'fas fa-clipboard-check', 
      content: rollCallContent 
    },
    { 
      id: 'exeat', 
      label: 'Exeat & Movements', 
      icon: 'fas fa-id-badge', 
      badge: activeExeats.length > 0 ? activeExeats.length : undefined, 
      content: exeatContent 
    },
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

      {/* Meal Deduction & Headcount Sync Modal */}
      {isMealDeductionModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2><i className="fas fa-utensils text-primary mr-2"></i>Dining Hall Meal Deduction</h2>
              <button onClick={() => setIsMealDeductionModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handlePostMealDeduction} style={{ padding: 20 }}>
              <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>Roll Call Present Headcount:</span>
                  <strong>{rollCallSummary.present} students</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>Active Hostels Included:</span>
                  <strong>{rollCallHostelId === 'ALL' ? 'All Hostels' : hostels.find(h => h.id === rollCallHostelId)?.name || 'Hostel'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>General Ledger Posting:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2b6cb0' }}>DR 5030 / CR 1220</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Meal Service</label>
                <select
                  className="portal-input"
                  value={mealDeductionData.mealType}
                  onChange={e => setMealDeductionData({ ...mealDeductionData, mealType: e.target.value })}
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner / Supper</option>
                </select>
              </div>

              <div className="portal-grid-2" style={{ marginBottom: 15 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Actual Meals Served</label>
                  <input
                    type="number"
                    min="0"
                    className="portal-input"
                    value={mealDeductionData.actualServedCount}
                    onChange={e => setMealDeductionData({ ...mealDeductionData, actualServedCount: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="portal-input"
                    value={mealDeductionData.costPerMeal}
                    onChange={e => setMealDeductionData({ ...mealDeductionData, costPerMeal: parseFloat(e.target.value) || 1.5 })}
                    required
                  />
                </div>
              </div>

              {/* Headcount Variance Calculation Box */}
              {(() => {
                const variance = mealDeductionData.actualServedCount - rollCallSummary.present;
                const totalCost = (mealDeductionData.actualServedCount * mealDeductionData.costPerMeal).toFixed(2);
                return (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 16,
                    background: variance === 0 ? '#f0fff4' : variance > 0 ? '#fffaf0' : '#fff5f5',
                    border: `1px solid ${variance === 0 ? '#c6f6d5' : variance > 0 ? '#feebc8' : '#fed7d7'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {variance === 0 ? '✓ Headcount Matches Roll Call' :
                         variance > 0 ? `⚠ Variance: +${variance} Extra Meals Served` :
                         `⚠ Variance: ${variance} Fewer Meals Served`}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#2d3748' }}>${totalCost}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Kitchen / Service Notes</label>
                <textarea
                  className="portal-input"
                  rows={2}
                  placeholder="e.g. Extra portions served to sports team..."
                  value={mealDeductionData.notes}
                  onChange={e => setMealDeductionData({ ...mealDeductionData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsMealDeductionModalOpen(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={isPostingDeduction}>
                  {isPostingDeduction ? 'Posting Journal...' : 'Post Inventory Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
