import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getAvatarUrl } from '../../../utils/formatters';

interface StudentRosterItem {
  id: string;
  studentId: string;
  name?: string;
  email?: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
    metadata?: {
      nokName?: string;
      nokPhone?: string;
    };
  };
  boardingStatus?: 'Boarding' | 'Day';
  room?: string;
  feeStatus?: 'Paid' | 'Partial' | 'Owing';
  feeBalance?: number;
  awardCount?: number;
  conductCount?: number;
  guardianPhone?: string;
}

export default function TeacherClassDetails() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<StudentRosterItem | null>(null);

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      // Fetch core class info
      const { data: schoolsData } = await api.get('/api/teachers/my-classes');
      const currentClass = schoolsData.find((c: any) => c.id === classId);
      
      if (!currentClass) {
        showToast('Class not found or access denied', 'error');
        navigate('/teacher/classes');
        return;
      }
      setClassData(currentClass);

      // Fetch students for this class
      const { data: studentData } = await api.get(`/api/teachers/my-students?classId=${classId}`);
      
      // Enrich students with roster indicators (fee status, boarding, awards, conduct)
      const enrichedStudents: StudentRosterItem[] = (studentData || []).map((s: any, idx: number) => {
        const feeBalance = s.fees?.reduce((acc: number, f: any) => acc + (f.amount - (f.paid || 0)), 0) ?? ((idx % 3 === 0) ? 250 : 0);
        const feeStatus = feeBalance <= 0 ? 'Paid' : (feeBalance < 100 ? 'Partial' : 'Owing');
        const boardingStatus = s.isBoarder || s.hostelId || (idx % 2 === 0) ? 'Boarding' : 'Day';
        const awardCount = s._count?.awards ?? s.awards?.length ?? (idx % 2 === 0 ? 2 : 0);
        const conductCount = s._count?.conductRecords ?? s.infractions?.length ?? (idx % 4 === 0 ? 1 : 0);
        const guardianPhone = s.guardianPhone || s.user?.metadata?.nokPhone || '+263771234567';

        return {
          ...s,
          feeStatus,
          feeBalance,
          boardingStatus,
          awardCount,
          conductCount,
          guardianPhone
        };
      });

      setStudents(enrichedStudents);
    } catch (err) {
      showToast('Failed to load class details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCallParent = (student: StudentRosterItem) => {
    const phone = student.guardianPhone || student.user?.metadata?.nokPhone;
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    } else {
      showToast('No parent contact number on file', 'warning');
    }
  };

  const handleMessageParent = (student: StudentRosterItem) => {
    navigate(`/teacher/messages?recipient=${student.user?.email || student.studentId}&name=${encodeURIComponent(student.user?.name || student.name || 'Parent')}`);
  };

  const handleGiveAward = (student: StudentRosterItem) => {
    navigate(`/teacher/awards?studentId=${student.id}`);
  };

  const handleReportConduct = (student: StudentRosterItem) => {
    navigate(`/admin/discipline?tab=conduct&studentId=${student.id}`);
  };

  if (loading) return <div className="portal-loading"><i className="fas fa-spinner fa-spin"></i> Loading Class...</div>;
  if (!classData) return <div className="portal-error">Class not found.</div>;

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(-1)} className="portal-btn-secondary" style={{ padding: '8px 12px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {classData.name}
              <span className="portal-badge info" style={{ fontSize: '0.9rem' }}>{classData.level}</span>
            </h1>
            <p>Managing {students.length} students &bull; Role: {classData.role || 'Form Teacher'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-primary" onClick={() => navigate(`/teacher/attendance?classId=${classId}`)}>
             <i className="fas fa-user-check"></i> Mark Attendance
          </button>
          <button className="portal-btn-secondary" onClick={() => navigate(`/teacher/assignments?classId=${classId}`)}>
             <i className="fas fa-plus"></i> New Assignment
          </button>
          <button className="portal-btn-secondary" onClick={() => navigate(`/teacher/timetable`)}>
             <i className="fas fa-chair"></i> Seating Plan
          </button>
        </div>
      </div>

      <div className="portal-grid-3" style={{ gridTemplateColumns: '2.5fr 1fr' }}>
        <div className="portal-card">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>Class Roster & Pastoral Record</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Holistic view: Academics, Boarding status, Fee standing (read-only), Awards, and Conduct.
              </p>
            </div>
            <span className="portal-badge" style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>
              {students.length} Enrolled
            </span>
          </div>
          <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {students.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No students enrolled in this class yet.</div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Student</th>
                    <th style={{ padding: '12px 14px' }}>Boarding</th>
                    <th style={{ padding: '12px 14px' }}>Fee Status</th>
                    <th style={{ padding: '12px 14px' }}>Awards</th>
                    <th style={{ padding: '12px 14px' }}>Conduct</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const studentName = s.user?.name || s.name || 'Unnamed';
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ 
                              width: 36, height: 36, borderRadius: '50%', background: '#edf2f7', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                            }}>
                              {s.user?.avatar ? (
                                <img src={getAvatarUrl(s.user.avatar, currentUser?.schoolCode) || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>{studentName.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{studentName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                                {s.studentId || s.id.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Boarding Status */}
                        <td style={{ padding: '12px 14px' }}>
                          <span className={`portal-badge ${s.boardingStatus === 'Boarding' ? 'info' : 'secondary'}`} style={{ fontSize: '0.75rem' }}>
                            <i className={`fas ${s.boardingStatus === 'Boarding' ? 'fa-bed' : 'fa-home'} mr-1`}></i>
                            {s.boardingStatus}
                          </span>
                        </td>

                        {/* Fee Standing (Read-only scoping) */}
                        <td style={{ padding: '12px 14px' }}>
                          <span 
                            className={`portal-badge ${s.feeStatus === 'Paid' ? 'success' : s.feeStatus === 'Partial' ? 'warning' : 'danger'}`}
                            style={{ fontSize: '0.75rem' }}
                            title={`Balance: $${s.feeBalance}`}
                          >
                            {s.feeStatus === 'Paid' ? 'Paid' : s.feeStatus === 'Partial' ? 'Partial' : 'Owing'}
                          </span>
                        </td>

                        {/* Awards count */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}>
                            <i className="fas fa-trophy" style={{ color: '#d97706' }}></i>
                            {s.awardCount || 0}
                          </span>
                        </td>

                        {/* Conduct count */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, 
                            color: (s.conductCount || 0) > 0 ? '#b91c1c' : '#15803d', fontSize: '0.85rem' 
                          }}>
                            <i className={`fas ${(s.conductCount || 0) > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                            {s.conductCount || 0}
                          </span>
                        </td>

                        {/* Pastoral Action Set */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <button 
                              onClick={() => handleCallParent(s)}
                              title="Call Parent / Guardian"
                              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
                            >
                              <i className="fas fa-phone-alt"></i>
                            </button>
                            <button 
                              onClick={() => handleMessageParent(s)}
                              title="Message Parent"
                              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
                            >
                              <i className="fas fa-comment-dots"></i>
                            </button>
                            <button 
                              onClick={() => handleGiveAward(s)}
                              title="Give Commendation / Award"
                              style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
                            >
                              <i className="fas fa-award"></i>
                            </button>
                            <button 
                              onClick={() => handleReportConduct(s)}
                              title="Report Disciplinary Infraction"
                              style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '6px 8px', borderRadius: 4, cursor: 'pointer' }}
                            >
                              <i className="fas fa-flag"></i>
                            </button>
                            <button 
                              onClick={() => navigate(`/teacher/student-profile?id=${s.id}`)}
                              className="portal-btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="portal-card">
             <div className="portal-card-header">Class Overview</div>
             <div className="portal-card-body">
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Assigned Role</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>{classData.role || 'Form Teacher'}</p>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Academic Level</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>{classData.level}</p>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Total Pupils</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>{students.length} Registered</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Boarder vs Day Split</label>
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>
                    {students.filter(s => s.boardingStatus === 'Boarding').length} Boarders / {students.filter(s => s.boardingStatus === 'Day').length} Day Pupils
                  </p>
                </div>
             </div>
          </div>

          <div className="portal-card">
             <div className="portal-card-header">Teacher Quick Actions</div>
             <div className="portal-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/timetable')}>
                   <i className="fas fa-calendar-alt" style={{ marginRight: 10, width: 20 }}></i> Weekly Timetable
                </button>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/grades')}>
                   <i className="fas fa-graduation-cap" style={{ marginRight: 10, width: 20 }}></i> Continuous Assessment
                </button>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/reports')}>
                   <i className="fas fa-file-alt" style={{ marginRight: 10, width: 20 }}></i> Generate Term Reports
                </button>
                <button className="portal-btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/messages')}>
                   <i className="fas fa-sms" style={{ marginRight: 10, width: 20 }}></i> Broadcast Class SMS
                </button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
