import React from 'react';

interface ReportGrade {
  subject: string;
  grade: string;
  score: number;
  credits?: number;
  comment?: string;
  teacher?: any;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  total: number;
  rate: number;
}

interface ReportData {
  type?: string;
  student?: {
    name: string;
    studentId: string;
    class?: { name: string };
    dob?: string;
    gender?: string;
    nationality?: string;
  };
  name?: string;
  id?: string;
  studentId?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  staffId?: string;
  assetId?: string;
  role?: string;
  email?: string;
  phone?: string;
  statusText?: string;
  category?: string;
  location?: string;
  custodian?: string;
  grades?: ReportGrade[];
  fees?: any[];
  totalFee?: number;
  totalPaid?: number;
  balance?: number;
  class?: { name: string };
  attendance?: any[];
  attendanceSummary?: AttendanceSummary;
  term: string;
  year: string;
  globalComment?: string;
  principalComment?: string;
  classTeacherComment?: string;
  schoolType?: string;
  classPosition?: number;
  totalStudentsInClass?: number;
}

interface ReportTemplateConfig {
  primaryColor: string;
  secondaryColor?: string;
  showAttendance?: boolean;
  showRanking?: boolean;
}

interface SchoolInfo {
  name: string;
  address?: string;
  type?: string;
  phone?: string;
  email?: string;
  website?: string;
  motto?: string;
  logoUrl?: string | null;
}

interface Props {
  data: ReportData;
  template: {
    config: ReportTemplateConfig;
    signatureUrl?: string;
    school?: SchoolInfo;
  };
}

const ReportDocument: React.FC<Props> = ({ data, template }) => {
  const { primaryColor } = template.config;
  const reportType = data.type || 'ACADEMIC';
  const school = template.school;

  const getTitle = () => {
    const type = data.schoolType || school?.type || '';
    const isUniversity = /university|varsity/i.test(type);
    const isMedical = /nursing|medical/i.test(type);
    switch (reportType) {
      case 'STAFF':  return 'STAFF EMPLOYMENT RECORD';
      case 'ASSETS': return 'ASSET INVENTORY REPORT';
      case 'FEES':   return 'FEE STATUS STATEMENT';
      default:
        if (isUniversity) return 'OFFICIAL ACADEMIC TRANSCRIPT';
        return isMedical ? 'COMPETENCY ASSESSMENT REPORT' : 'ACADEMIC PROGRESS REPORT';
    }
  };

  const calculateGradePoint = (score: number) => {
    if (score >= 75) return 4.0;
    if (score >= 65) return 3.0;
    if (score >= 60) return 2.0;
    if (score >= 50) return 1.0;
    return 0.0;
  };

  const getPerformanceBand = (avg: number) => {
    if (avg >= 75) return { label: 'DISTINCTION', color: '#047857' };
    if (avg >= 65) return { label: 'MERIT',       color: '#0284c7' };
    if (avg >= 50) return { label: 'PASS',        color: '#d97706' };
    return { label: 'FAIL', color: '#dc2626' };
  };

  const getLetterGrade = (score: number) => {
    const type = data.schoolType || school?.type || '';
    const isUniversity = /university|varsity/i.test(type);
    if (isUniversity) {
      if (score >= 75) return '1st';
      if (score >= 65) return '2.1';
      if (score >= 60) return '2.2';
      if (score >= 50) return 'Pass';
      return 'Fail';
    }
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'U';
  };

  const getTeacherName = (g: ReportGrade) => {
    if (!g.teacher) return '';
    const t = g.teacher as any;
    return t.user?.name || t.name || '';
  };

  const studentName = data.name || data.student?.name || '';
  const studentId   = data.studentId || data.student?.studentId || '';
  const className   = data.class?.name || data.student?.class?.name || '';

  const attendanceSummary: AttendanceSummary | null = (() => {
    if (data.attendanceSummary) return data.attendanceSummary;
    if (Array.isArray(data.attendance) && data.attendance.length > 0) {
      const present = data.attendance.filter((a: any) => a.status === 'present').length;
      const total   = data.attendance.length;
      const absent  = total - present;
      return { present, absent, total, rate: total > 0 ? Math.round((present / total) * 100) : 100 };
    }
    return null;
  })();

  const validGrades = (data.grades || []).filter(g => typeof g.score === 'number' && !isNaN(g.score));
  const avgScore    = validGrades.length > 0
    ? Math.round(validGrades.reduce((s, g) => s + g.score, 0) / validGrades.length)
    : 0;
  const band        = validGrades.length > 0 ? getPerformanceBand(avgScore) : null;

  const isUniversity = /university|varsity/i.test(data.schoolType || school?.type || '');
  const gpaData = validGrades.reduce((acc, g) => {
    const credits = g.credits || 0;
    acc.totalPoints += calculateGradePoint(g.score) * credits;
    acc.totalCredits += credits;
    return acc;
  }, { totalPoints: 0, totalCredits: 0 });
  const gpa = gpaData.totalCredits > 0
    ? (gpaData.totalPoints / gpaData.totalCredits).toFixed(2)
    : '0.00';

  const sectionTitle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: primaryColor,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: `2px solid ${primaryColor}`,
    paddingBottom: '4px',
    marginBottom: '12px',
    marginTop: '20px'
  };

  const infoLabel: React.CSSProperties = {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '2px'
  };

  const infoValue: React.CSSProperties = {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#1e293b'
  };

  return (
    <div
      id={`report-${data.id || data.studentId}`}
      className="report-container"
      style={{
        padding: '36px 40px',
        background: 'white',
        color: '#1e293b',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        width: '794px',
        margin: '0 auto',
        minHeight: '1123px',
        position: 'relative',
        boxSizing: 'border-box',
        fontSize: '13px'
      }}
    >
      {/* HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `4px solid ${primaryColor}`,
        paddingBottom: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ width: '72px', height: '72px', flexShrink: 0 }}>
          {school?.logoUrl ? (
            <img
              src={school.logoUrl}
              alt="School Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `${primaryColor}18`, border: `2px solid ${primaryColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', color: primaryColor, fontWeight: 800
            }}>
              {(school?.name || 'S').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', flex: 1, padding: '0 20px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: primaryColor, letterSpacing: '0.02em' }}>
            {school?.name || 'ACADEX HIGH SCHOOL'}
          </div>
          {school?.address && (
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{school.address}</div>
          )}
          {school?.motto && (
            <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: '#94a3b8', marginTop: '2px' }}>"{school.motto}"</div>
          )}
          {(school?.phone || school?.email) && (
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
              {[school?.phone, school?.email].filter(Boolean).join('  ·  ')}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '0.8rem', fontWeight: 800, color: primaryColor,
            background: `${primaryColor}12`, padding: '4px 12px',
            borderRadius: '20px', display: 'inline-block', marginBottom: '6px'
          }}>
            {getTitle()}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{data.term} · {data.year} Academic Year</div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
            Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* STUDENT INFO BAND */}
      {(reportType === 'ACADEMIC' || reportType === 'ATTENDANCE' || reportType === 'ENROLLMENT') && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          background: `${primaryColor}06`,
          border: `1px solid ${primaryColor}20`,
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '18px'
        }}>
          {[
            { label: 'STUDENT NAME', value: studentName },
            { label: 'STUDENT ID',   value: studentId },
            { label: 'CLASS / FORM', value: className },
            {
              label: 'DATE OF BIRTH',
              value: (data.dob || (data.student as any)?.dob)
                ? new Date((data.dob || (data.student as any).dob) as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'
            },
            { label: 'GENDER', value: ((data.gender || (data.student as any)?.gender) || '—').toUpperCase() }
          ].map((info, idx) => (
            <div key={idx}>
              <div style={infoLabel}>{info.label}</div>
              <div style={infoValue}>{info.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* STAFF */}
      {reportType === 'STAFF' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Role',     value: data.role },
              { label: 'Staff ID', value: data.staffId },
              { label: 'Email',    value: data.email },
              { label: 'Phone',    value: data.phone || 'N/A' }
            ].map((f, i) => (
              <div key={i}>
                <div style={infoLabel}>{f.label}</div>
                <div style={infoValue}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: '16px', border: `1px solid ${primaryColor}30`, borderRadius: 8, background: `${primaryColor}05` }}>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>
              This document serves as an official record of employment/service for the above named individual.
            </p>
          </div>
        </div>
      )}

      {/* ASSETS */}
      {reportType === 'ASSETS' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Category',   value: data.category },
              { label: 'Serial / ID', value: data.assetId },
              { label: 'Location',   value: data.location },
              { label: 'Custodian',  value: data.custodian || 'Unassigned' }
            ].map((f, i) => (
              <div key={i}>
                <div style={infoLabel}>{f.label}</div>
                <div style={infoValue}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <p style={{ margin: 0 }}><strong>Condition:</strong> {data.statusText}</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Asset verification record generated on {new Date().toLocaleDateString()}.
            </p>
          </div>
        </div>
      )}

      {/* FEES */}
      {reportType === 'FEES' && (
        <div style={{ marginTop: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '0.75rem' }}>DESCRIPTION</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem' }}>AMOUNT</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem' }}>PAID</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '0.75rem' }}>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {(data.fees || []).map((f: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px' }}>{f.description || `${data.term} ${data.year} Fees`}</td>
                  <td style={{ textAlign: 'right', padding: '10px 8px' }}>${f.amount.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '10px 8px' }}>${f.paid.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '10px 8px' }}>${(f.amount - f.paid).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700, background: '#f8fafc' }}>
                <td style={{ padding: '10px 8px' }}>TOTALS</td>
                <td style={{ textAlign: 'right', padding: '10px 8px' }}>${data.totalFee?.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px' }}>${data.totalPaid?.toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: (data.balance || 0) > 0 ? '#dc2626' : '#059669' }}>
                  ${data.balance?.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ACADEMIC GRADES TABLE */}
      {(reportType === 'ACADEMIC' || reportType === 'ATTENDANCE') && (
        <>
          <div style={sectionTitle}>Academic Performance — {data.term} {data.year}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: primaryColor, color: 'white' }}>
                <th style={{ padding: '9px 10px', textAlign: 'left', borderRadius: '6px 0 0 6px', fontWeight: 700 }}>
                  {isUniversity ? 'COURSE' : 'SUBJECT'}
                </th>
                {isUniversity && (
                  <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>CREDITS</th>
                )}
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>SCORE (%)</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>GRADE</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700 }}>CLASS TEACHER</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', borderRadius: '0 6px 6px 0', fontWeight: 700 }}>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {validGrades.length === 0 ? (
                <tr>
                  <td colSpan={isUniversity ? 6 : 5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No grades recorded for this period.
                  </td>
                </tr>
              ) : (
                validGrades.map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 600 }}>{g.subject}</td>
                    {isUniversity && (
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>{g.credits || 0}</td>
                    )}
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: g.score >= 50 ? '#059669' : '#dc2626' }}>
                      {g.score}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', background: `${primaryColor}15`, color: primaryColor, fontWeight: 800, fontSize: '0.75rem' }}>
                        {g.grade || getLetterGrade(g.score)}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#64748b', fontSize: '0.78rem' }}>
                      {getTeacherName(g)}
                    </td>
                    <td style={{ padding: '9px 10px', color: '#64748b', fontStyle: 'italic', fontSize: '0.78rem' }}>
                      {g.comment || 'Satisfactory progress.'}
                    </td>
                  </tr>
                ))
              )}
              {isUniversity && gpaData.totalCredits > 0 && (
                <tr style={{ background: `${primaryColor}08`, fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'right' }}>WEIGHTED GPA (4.0 SCALE)</td>
                  <td colSpan={4} style={{ padding: '10px', color: primaryColor, fontSize: '1rem' }}>{gpa}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* PERFORMANCE SUMMARY STRIP */}
          {validGrades.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: attendanceSummary ? 'repeat(5, 1fr)' : 'repeat(3, 1fr)',
              gap: '10px',
              marginTop: '14px',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={infoLabel}>SUBJECTS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: primaryColor }}>{validGrades.length}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={infoLabel}>AVERAGE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: primaryColor }}>{avgScore}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={infoLabel}>PERFORMANCE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: band?.color || '#1e293b' }}>{band?.label || '—'}</div>
              </div>
              {data.classPosition && (
                <div style={{ textAlign: 'center' }}>
                  <div style={infoLabel}>CLASS POSITION</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: primaryColor }}>
                    {data.classPosition}{data.totalStudentsInClass ? ` / ${data.totalStudentsInClass}` : ''}
                  </div>
                </div>
              )}
              {attendanceSummary && (
                <div style={{ textAlign: 'center' }}>
                  <div style={infoLabel}>ATTENDANCE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: attendanceSummary.rate >= 80 ? '#059669' : '#dc2626' }}>
                    {attendanceSummary.rate}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                    {attendanceSummary.present}P / {attendanceSummary.absent}A
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GENERAL REMARK */}
          {data.globalComment && (
            <div style={{ marginTop: '14px' }}>
              <div style={sectionTitle}>General Remarks</div>
              <div style={{ padding: '12px 14px', background: `${primaryColor}05`, border: `1px solid ${primaryColor}25`, borderRadius: '8px', color: '#475569', lineHeight: 1.6, fontSize: '0.82rem' }}>
                {data.globalComment}
              </div>
            </div>
          )}

          {/* COMMENTS */}
          {(data.classTeacherComment || data.principalComment) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
              {data.classTeacherComment && (
                <div>
                  <div style={sectionTitle}>Class Teacher's Comment</div>
                  <div style={{ padding: '10px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', color: '#0c4a6e', fontSize: '0.8rem', lineHeight: 1.6, minHeight: '50px' }}>
                    {data.classTeacherComment}
                  </div>
                  <div style={{ marginTop: '24px', borderTop: '1px dashed #94a3b8', paddingTop: '4px', fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center' }}>
                    Class Teacher's Signature
                  </div>
                </div>
              )}
              {data.principalComment && (
                <div>
                  <div style={sectionTitle}>Head of Institution's Comment</div>
                  <div style={{ padding: '10px 12px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', color: '#713f12', fontSize: '0.8rem', lineHeight: 1.6, minHeight: '50px' }}>
                    {data.principalComment}
                  </div>
                  <div style={{ marginTop: '24px', borderTop: '1px dashed #94a3b8', paddingTop: '4px', fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center' }}>
                    Head's Signature
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* FOOTER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: '28px',
        paddingTop: '16px',
        borderTop: `2px solid ${primaryColor}20`
      }}>
        <div style={{ flex: 1, maxWidth: '60%' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', marginBottom: '6px' }}>
            OFFICIAL REMARKS
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            This is a digitally generated report from the Acadex School Management System.
            The information contained herein is verified and authentic as of the date of issue.
            Any alterations render this document invalid.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, opacity: 0.5 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3h6v6H3V3zm1 1v4h4V4H4zm1 1h2v2H5V5zM3 15h6v6H3v-6zm1 1v4h4v-4H4zm1 1h2v2H5v-2zM15 3h6v6h-6V3zm1 1v4h4V4h-4zm1 1h2v2h-2V5zM15 15h2v2h-2v-2zM19 19h2v2h-2v-2zM17 17h2v2h-2v-2zM21 15h2v2h-2v-2zM15 19h2v2h-2v-2zM19 15h2v2h-2v-2zM21 19h2v2h-2v-2z" fill={primaryColor} />
            </svg>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
              Scan to verify<br />document authenticity
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: '180px' }}>
          <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '6px' }}>
            {template.signatureUrl ? (
              <img
                src={template.signatureUrl}
                alt="Authorized Signature"
                style={{ maxWidth: '160px', maxHeight: '55px', objectFit: 'contain' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ borderBottom: '1px dashed #cbd5e0', width: '160px', height: '1px' }} />
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.78rem', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
            Authorized Signatory
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {school?.name || 'School'} — Academic Seal
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.6rem',
        color: '#94a3b8'
      }}>
        <div>ACADEX SCHOOL MANAGEMENT SYSTEM — VERIFIED DOCUMENT</div>
        <div>{school?.name || 'School'} · {data.term} {data.year} · {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
};

export default ReportDocument;
