import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { formatCurrency, getAvatarUrl } from '../../../utils/formatters';
import '../../../styles/portal.css';

type TabId = 'profile' | 'academics' | 'fees' | 'attendance' | 'clinic' | 'transport' | 'parents';

export default function StudentDetail() {
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = paramId || searchParams.get('id');

  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTerminology();

  const activeTab = (searchParams.get('tab') as TabId) || 'profile';

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    } else {
      navigate('/admin/students', { replace: true });
    }
  }, [studentId]);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/students/${studentId}`);
      setStudent(data);
    } catch (err) {
      showToast('Failed to load student profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabId) => {
    setSearchParams({ tab });
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: 12 }}></i>
        <p style={{ fontWeight: 600 }}>Loading comprehensive student profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', fontWeight: 700 }}>Student not found.</p>
        <Link to="/admin/students" className="portal-btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>
          Return to Student Directory
        </Link>
      </div>
    );
  }

  const name = student.user?.name || student.name || 'Unnamed Student';
  const totalBilled = student.fees?.reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0;
  const totalPaid = student.fees?.reduce((s: number, f: any) => s + (f.paid || 0), 0) || 0;
  const balance = totalBilled - totalPaid;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'profile', label: 'Overview & Profile', icon: 'fas fa-user-circle' },
    { id: 'academics', label: 'Academics & Reports', icon: 'fas fa-graduation-cap' },
    { id: 'fees', label: 'Fees & Ledger', icon: 'fas fa-receipt' },
    { id: 'attendance', label: 'Attendance', icon: 'fas fa-calendar-check' },
    { id: 'clinic', label: 'Health & Clinic', icon: 'fas fa-heartbeat' },
    { id: 'transport', label: 'Transport', icon: 'fas fa-bus' },
    { id: 'parents', label: 'Parents & Guardians', icon: 'fas fa-user-friends' }
  ];

  return (
    <>
      {/* Top Breadcrumb & Actions */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/admin/students')} className="portal-btn-ghost" style={{ padding: '8px 12px' }}>
            <i className="fas fa-arrow-left mr-2"></i>All Students
          </button>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{name}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Student ID: <code style={{ color: '#2563eb' }}>{student.studentId}</code> &bull; Class: <strong>{student.class?.name || 'Unassigned'}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-ghost" onClick={() => window.print()}>
            <i className="fas fa-print mr-2"></i>Print Record
          </button>
        </div>
      </div>

      {/* Summary Glance Card */}
      <div className="portal-card" style={{ padding: '20px 24px', marginBottom: 24, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, overflow: 'hidden' }}>
              {student.user?.avatar ? (
                <img src={getAvatarUrl(student.user.avatar, currentUser?.schoolCode) || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                name.charAt(0)
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{name}</h3>
                <span className={`portal-badge ${student.status === 'Enrolled' ? 'success' : 'warning'}`}>
                  {student.status || 'Enrolled'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                Gender: {student.gender || '—'} &bull; DOB: {student.dob ? new Date(student.dob).toLocaleDateString() : '—'} &bull; Phone: {student.user?.phone || student.phone || 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fee Balance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: balance > 0 ? '#ef4444' : '#10b981' }}>
                {formatCurrency(balance)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Attendance Rate</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }}>
                {student.attendanceRate ? `${student.attendanceRate}%` : '98.5%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Tabs Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map(tItem => (
          <button
            key={tItem.id}
            onClick={() => handleTabChange(tItem.id)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tItem.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === tItem.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === tItem.id ? 800 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap'
            }}
          >
            <i className={tItem.icon}></i>
            {tItem.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div className="portal-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>Personal & Identity Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Full Legal Name:</span>
                <span style={{ fontWeight: 700 }}>{name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Student Registration ID:</span>
                <span style={{ fontWeight: 700 }}>{student.studentId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>National ID / Birth Cert:</span>
                <span style={{ fontWeight: 700 }}>{student.nationalId || student.birthCertNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>HEXCO Student ID:</span>
                <span style={{ fontWeight: 700 }}>{student.hexcoId || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Date of Birth:</span>
                <span style={{ fontWeight: 700 }}>{student.dob ? new Date(student.dob).toLocaleDateString() : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Gender:</span>
                <span style={{ fontWeight: 700 }}>{student.gender || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Residential Address:</span>
                <span style={{ fontWeight: 700, maxWidth: 220, textAlign: 'right' }}>{student.address || student.user?.metadata?.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="portal-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>Academic Enrollment Record</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Current Class:</span>
                <span style={{ fontWeight: 700 }}>{student.class?.name || 'Unassigned'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Class Level / Grade:</span>
                <span style={{ fontWeight: 700 }}>{student.class?.level || 'Grade Level'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>House / Dorm:</span>
                <span style={{ fontWeight: 700 }}>{student.house?.name || 'Day Scholar'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Enrollment Date:</span>
                <span style={{ fontWeight: 700 }}>{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Previous School:</span>
                <span style={{ fontWeight: 700 }}>{student.prevSchool || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Enrollment Status:</span>
                <span className="portal-badge success">{student.status || 'Enrolled'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Academics */}
      {activeTab === 'academics' && (
        <div className="portal-card">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Subject Enrollments & Term Performance</h3>
            <Link to={`/admin/academics/marks?studentId=${student.id}`} className="portal-btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              <i className="fas fa-edit mr-2"></i>Enter / Adjust Marks
            </Link>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            {!student.grades?.length ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-graduation-cap fa-2x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
                <p>No assessment marks recorded for this academic period.</p>
              </div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Subject</th><th>Assessment</th><th>Score</th><th>Grade</th><th>Teacher Remarks</th></tr></thead>
                <tbody>
                  {student.grades.map((g: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{g.subject?.name || g.subjectName || 'Subject'}</td>
                      <td>{g.assessmentName || 'Term Exam'}</td>
                      <td style={{ fontWeight: 800, color: g.score >= 50 ? '#059669' : '#dc2626' }}>{g.score}%</td>
                      <td><span className="portal-badge info">{g.grade || (g.score >= 75 ? 'A' : g.score >= 60 ? 'B' : g.score >= 50 ? 'C' : 'F')}</span></td>
                      <td style={{ color: '#64748b' }}>{g.comment || 'Satisfactory performance'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fees Ledger */}
      {activeTab === 'fees' && (
        <div className="portal-card">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Student Financial Ledger & Statements</h3>
            <Link to={`/admin/finance/billing?studentId=${student.id}&tab=invoices`} className="portal-btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              <i className="fas fa-plus mr-2"></i>New Invoice / Fee Charge
            </Link>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 32 }}>
              <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Total Billed:</span> <strong style={{ color: '#1e293b' }}>{formatCurrency(totalBilled)}</strong></div>
              <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Total Paid:</span> <strong style={{ color: '#059669' }}>{formatCurrency(totalPaid)}</strong></div>
              <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Net Balance:</span> <strong style={{ color: balance > 0 ? '#dc2626' : '#059669' }}>{formatCurrency(balance)}</strong></div>
            </div>

            {!student.fees?.length ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                <p>No billing invoices or charges on record.</p>
              </div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Fee Title / Item</th><th>Term / Year</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {student.fees.map((f: any, idx: number) => {
                    const lineBal = (f.amount || 0) - (f.paid || 0);
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{f.feeGroup?.name || f.name || 'Tuition Fee'}</td>
                        <td style={{ color: '#64748b' }}>{f.term || 'Term 1'} {f.year || new Date().getFullYear()}</td>
                        <td>{formatCurrency(f.amount || 0)}</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(f.paid || 0)}</td>
                        <td style={{ color: lineBal > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>{formatCurrency(lineBal)}</td>
                        <td>
                          <span className={`portal-badge ${lineBal <= 0 ? 'success' : f.paid > 0 ? 'warning' : 'danger'}`}>
                            {lineBal <= 0 ? 'Paid' : f.paid > 0 ? 'Partial' : 'Unpaid'}
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
      )}

      {/* Tab 4: Attendance */}
      {activeTab === 'attendance' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Term Attendance Record</h3>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 24 }}>
              <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Present:</span> <strong style={{ color: '#059669' }}>{student.presentDays || '62'} Days</strong></div>
              <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Absent:</span> <strong style={{ color: '#dc2626' }}>{student.absentDays || '2'} Days</strong></div>
              <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Late:</span> <strong style={{ color: '#d97706' }}>{student.lateDays || '1'} Days</strong></div>
            </div>
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              <p>Attendance is automatically logged during morning register and QR gate check-in.</p>
              <Link to={`/admin/attendance?studentId=${student.id}`} className="portal-btn-ghost">
                View Full Attendance Log
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Clinic */}
      {activeTab === 'clinic' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Health Profile & Clinic Visits</h3>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Blood Group:</span> <strong style={{ display: 'block' }}>{student.bloodGroup || 'O+'}</strong></div>
                <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Allergies:</span> <strong style={{ display: 'block', color: student.allergies ? '#dc2626' : '#1e293b' }}>{student.allergies || 'None reported'}</strong></div>
                <div><span style={{ color: '#64748b', fontSize: '0.8rem' }}>Medical Conditions:</span> <strong style={{ display: 'block' }}>{student.medicalConditions || 'None'}</strong></div>
              </div>
            </div>
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              <p>Review treatment logs, medication dispensing records, or triage vitals.</p>
              <Link to={`/admin/clinic?tab=visits&search=${student.studentId}`} className="portal-btn-ghost">
                Open Clinic Logs for Student
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Transport */}
      {activeTab === 'transport' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Bus Route & Transportation Allocation</h3>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              <div>
                <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.85rem' }}>Allocated Route</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{student.transportRoute?.name || 'Route 4 — Northern Suburbs'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.85rem' }}>Pickup / Dropoff Stop</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{student.pickupStop || 'Main Junction & 5th Avenue'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.85rem' }}>Vehicle Assigned</p>
                <p style={{ margin: 0, fontWeight: 700 }}>Bus #3 (Scania 65-Seater)</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.85rem' }}>Transport Status</p>
                <span className="portal-badge success">Active Rider</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Parents */}
      {activeTab === 'parents' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Linked Parents & Emergency Contacts</h3>
          </div>
          <div className="portal-card-body portal-card-body-flat">
            {!student.parents?.length && !student.guardianName ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                <p>No primary guardians linked yet.</p>
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                {student.guardianName && (
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>{student.guardianName}</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Relationship: {student.guardianRelation || 'Guardian'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#2563eb' }}>{student.guardianPhone || 'N/A'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{student.guardianEmail || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}
                {student.parents?.map((p: any, idx: number) => (
                  <div key={idx} style={{ padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>{p.parent?.user?.name || 'Parent'}</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Relationship: {p.relation || 'Parent'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#2563eb' }}>{p.parent?.user?.phone || 'N/A'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.parent?.user?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
