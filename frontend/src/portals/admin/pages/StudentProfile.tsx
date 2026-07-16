import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';

export default function StudentProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { isUniversity, t } = useTerminology();
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get('id');

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getYearLabel = (typeStr: string) => {
    const type = (typeStr || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college') || type.includes('poly') || type.includes('nursing') || type.includes('medical')) {
      return 'Academic Year (Part)';
    }
    if (type.includes('primary')) {
      return 'Grade';
    }
    if (type.includes('secondary') || type.includes('high')) {
      return 'Form';
    }
    return 'Class Year';
  };

  const getYearValueLabel = (typeStr: string, partValue: number | string | null | undefined) => {
    const part = partValue !== null && partValue !== undefined ? partValue : '1';
    const type = (typeStr || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college') || type.includes('poly') || type.includes('nursing') || type.includes('medical')) {
      return `Part ${part}`;
    }
    if (type.includes('primary')) {
      return `Grade ${part}`;
    }
    if (type.includes('secondary') || type.includes('high')) {
      return `Form ${part}`;
    }
    return `Year ${part}`;
  };

  const schoolType = currentUser?.schoolType || 'Secondary';

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    } else {
      navigate(-1);
    }
  }, [studentId]);

  const fetchStudentData = async () => {
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

  if (loading) return <div className="portal-loading"><i className="fas fa-spinner fa-spin"></i> Loading Profile...</div>;
  if (!student) return <div className="portal-error">Student not found.</div>;

  const academicStats = {
    average: student.grades?.length ? (student.grades.reduce((s: number, g: any) => s + g.score, 0) / student.grades.length).toFixed(1) + '%' : '—',
    rank: student.rank || '—',
    attendance: student.attendanceRate ? student.attendanceRate + '%' : '—'
  };

  const fees = {
    total: student.fees?.reduce((s: number, f: any) => s + f.amount, 0) || 0,
    paid: student.fees?.reduce((s: number, f: any) => s + f.paid, 0) || 0,
  };
  const feeBalance = fees.total - fees.paid;
  const payPercent = fees.total > 0 ? (fees.paid / fees.total) * 100 : 0;

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(-1)} className="portal-btn-secondary" style={{ padding: '8px 12px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1>Student Profile: {student.user?.name || student.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {currentUser?.role === 'SCHOOL_ADMIN' && <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-edit"></i> Edit Details</button>}
          <button className="portal-btn-primary" onClick={() => window.print()}><i className="fas fa-print"></i> Print Record</button>
        </div>
      </div>

      <div className="portal-grid-3">
        <div className="portal-card">
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: '50%', background: '#f0f4f8', 
              margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', color: 'var(--school-primary, #3182ce)', fontWeight: 700, overflow: 'hidden'
            }}>
              {student.user?.avatar ? (
                <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${student.user.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (student.user?.name || student.name || 'S').charAt(0)
              )}
            </div>
            <h3 style={{ margin: '0 0 5px' }}>{student.user?.name || student.name}</h3>
            <p style={{ margin: 0, color: '#718096' }}>ID: {student.studentId} &bull; {student.class?.name || 'No Class'}</p>
          </div>
        </div>
        <div className="portal-card">
          <div className="portal-card-header">Academic Summary</div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#718096' }}>Term Average:</span>
              <span style={{ fontWeight: 700, color: '#2f855a' }}>{academicStats.average}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#718096' }}>Rank:</span>
              <span style={{ fontWeight: 600 }}>{academicStats.rank}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#718096' }}>Attendance:</span>
              <span style={{ fontWeight: 600, color: 'var(--school-primary, #3182ce)' }}>{academicStats.attendance}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTop: '1px solid #edf2f7' }}>
              <span style={{ color: '#718096' }}>Status / Standing:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                 <span className={`portal-badge ${student.status === 'Enrolled' ? 'success' : 'warning'}`}>{student.status}</span>
                 <span className={`portal-badge ${student.standing === 'Normal' ? 'info' : student.standing === 'Withdraw' ? 'danger' : 'warning'}`}>{student.standing || 'Normal'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ color: '#718096' }}>Current {getYearLabel(schoolType)}:</span>
              <span style={{ fontWeight: 700 }}>{getYearValueLabel(schoolType, student.part)}</span>
            </div>
          </div>
        </div>
        <div className="portal-card">
          <div className="portal-card-header">Financial Summary</div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#718096' }}>Total Billed:</span>
              <span style={{ fontWeight: 600 }}>${fees.total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#718096' }}>Fees Paid:</span>
              <span style={{ fontWeight: 600, color: '#2f855a' }}>${fees.paid.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#718096' }}>Outstanding:</span>
              <span style={{ fontWeight: 700, color: 'var(--portal-danger)' }}>${feeBalance.toLocaleString()}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#edf2f7', borderRadius: 3, marginTop: 15 }}>
              <div style={{ width: `${Math.min(payPercent, 100)}%`, height: '100%', background: payPercent >= 100 ? 'var(--portal-success)' : 'var(--portal-warning)', borderRadius: 3 }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">Personal Information</div>
        <div className="portal-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Guardian / Next of Kin</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.user?.metadata?.nokName || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Kin Contact</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.user?.metadata?.nokPhone || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Date of Birth</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.user?.metadata?.dob ? new Date(student.user.metadata.dob).toLocaleDateString() : student.dob ? new Date(student.dob).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Gender</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.user?.metadata?.gender || student.gender || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Physical Address</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.user?.metadata?.address || student.address || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Email Address</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.user?.email || student.email || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="portal-card" style={{ margin: 0 }}>
          <div className="portal-card-header">Identity & Onboarding Details</div>
          <div className="portal-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Age</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.age ? `${student.age} Years` : '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Nationality</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.nationality || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Mother Tongue</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.motherTongue || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Physical Handicap</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.isPhysicallyHandicapped ? `Yes (${student.handicapDetails || 'No details'})` : 'No'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Guardian Name</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.guardianName || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Guardian Phone</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.guardianPhone || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>City</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.city || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>State / Province</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.state || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ margin: 0 }}>
          <div className="portal-card-header">Institutional & Campus Life</div>
          <div className="portal-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Student House</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.house?.name || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Student Club</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.club?.name || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Section</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.section || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Dormitory / Room</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.dormitory || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Boarding Status</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.boardingStatus || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Student Category</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.category || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Program Level</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.programLevel || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Study Mode</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.studyMode?.replace('_', ' ') || '—'}</p>
              </div>
            </div>
            {student.researchTitle && (
              <div style={{ marginTop: 15, paddingTop: 10, borderTop: '1px solid #edf2f7' }}>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Research / Thesis Title</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#2d3748' }}>{student.researchTitle}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">Previous Academic History & Documents</div>
        <div className="portal-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Previous School</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.prevSchool || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Previous Class/Grade</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.prevSchoolClass || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Previous School Address</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{student.prevSchoolAddress || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Transfer Certificate</p>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {student.hasTransferCertificate ? 'Yes' : 'No'}
                {student.transferCertificateUrl && (
                  <a 
                    href={`${BASE_URL}/api/storage/file/${student.transferCertificateUrl}?token=${localStorage.getItem('acadex_token')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ marginLeft: 8, fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    <i className="fas fa-eye"></i> View Doc
                  </a>
                )}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Birth Certificate</p>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {student.birthCertificateUrl ? 'Yes' : 'No'}
                {student.birthCertificateUrl && (
                  <a 
                    href={`${BASE_URL}/api/storage/file/${student.birthCertificateUrl}?token=${localStorage.getItem('acadex_token')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ marginLeft: 8, fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    <i className="fas fa-eye"></i> View Doc
                  </a>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {student.academicHistory && typeof student.academicHistory === 'object' && (student.academicHistory as any).migrations && (student.academicHistory as any).migrations.length > 0 && (
        <div className="portal-card" style={{ marginTop: 24 }}>
          <div className="portal-card-header">Class Migration History</div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source Class</th>
                  <th>Source {getYearLabel(schoolType)}</th>
                  <th>Destination Class</th>
                  <th>Destination {getYearLabel(schoolType)}</th>
                  <th>Migrated By</th>
                </tr>
              </thead>
              <tbody>
                {(student.academicHistory as any).migrations.map((m: any, i: number) => (
                  <tr key={i}>
                    <td>{new Date(m.date).toLocaleString()}</td>
                    <td>{m.fromClassName || 'Unassigned'}</td>
                    <td>{getYearValueLabel(schoolType, m.fromPart)}</td>
                    <td style={{ fontWeight: 'bold', color: '#2b6cb0' }}>{m.toClassName}</td>
                    <td style={{ fontWeight: 'bold', color: '#2b6cb0' }}>{getYearValueLabel(schoolType, m.toPart)}</td>
                    <td>{m.migratedBy || 'Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isUniversity && (
        <div className="portal-card" style={{ marginTop: 24 }}>
          <div className="portal-card-header">Academic Timeline & Regulatory Limits</div>
          <div className="portal-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Enrollment Date</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : 'Initial Entry'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Expected Completion</p>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {student.enrolledAt && student.class?.department?.duration 
                    ? new Date(new Date(student.enrolledAt).setFullYear(new Date(student.enrolledAt).getFullYear() + student.class.department.duration)).toLocaleDateString()
                    : '4 Years from Entry'}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: 'var(--portal-danger)', fontSize: '0.85rem', fontWeight: 700 }}>Maximum Time Limit (NUST Regs)</p>
                <p style={{ margin: 0, fontWeight: 800, color: 'var(--portal-danger)' }}>
                  {student.enrolledAt && student.class?.department?.duration 
                    ? new Date(new Date(student.enrolledAt).setFullYear(new Date(student.enrolledAt).getFullYear() + student.class.department.duration + 2)).toLocaleDateString()
                    : '6 Years from Entry'}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px', color: '#718096', fontSize: '0.85rem' }}>Degree Level</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{student.class?.department?.duration}-Year Honours Degree</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
